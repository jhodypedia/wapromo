import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Session } from "../models/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const sessions = new Map(); // sessionId → socket aktif

// setup path fix agar tidak tergantung process.cwd()
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSION_ROOT = path.join(__dirname, "..", "sessions");

// auto create folder sessions root
if (!fs.existsSync(SESSION_ROOT)) {
  fs.mkdirSync(SESSION_ROOT, { recursive: true });
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Mulai session WA baru
 */
export async function startSession(sessionId, io, mode = "qr", label = null) {
  try {
    const sessionPath = path.join(SESSION_ROOT, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    });

    sessions.set(sessionId, sock);

    await Session.upsert({ sessionId, label, status: "connecting", mode });
    io.emit("wa_status", { sessionId, status: "connecting" });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (mode === "qr" && qr) {
        // kirim QR ke frontend
        await delay(6000);
        io.emit("wa_qr", { sessionId, qr });
      }

      if (connection === "open") {
        console.log(`✅ Session ${sessionId} connected`);
        await Session.upsert({ sessionId, label, status: "connected", mode });
        io.emit("wa_status", { sessionId, status: "connected" });
      }

      if (connection === "close") {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        console.log(`⚠️ Session ${sessionId} closed (${code})`);

        await Session.upsert({ sessionId, label, status: "disconnected", mode });
        io.emit("wa_status", { sessionId, status: "disconnected" });

        if (shouldReconnect) {
          console.log(`🔄 Reconnecting ${sessionId}...`);
          await Session.upsert({ sessionId, label, status: "reconnecting", mode });
          io.emit("wa_status", { sessionId, status: "reconnecting" });
          setTimeout(() => startSession(sessionId, io, mode, label), 3000);
        } else {
          sessions.delete(sessionId);
        }
      }
    });
  } catch (err) {
    console.error("❌ Error startSession:", err.message);
  }
}

/**
 * Ambil socket aktif
 */
export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Generate Pairing Code asli dari Baileys
 */
export async function getPairingCode(sessionId, phoneNumber) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const jid = phoneNumber.replace(/\D/g, "") + "@s.whatsapp.net";

  await delay(6000);

  try {
    const code = await sock.requestPairingCode(jid);
    return code; // return apa adanya
  } catch (err) {
    throw new Error("Gagal generate pairing code: " + err.message);
  }
}

/**
 * Cek nomor WhatsApp
 */
export async function checkWaNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const res = await sock.onWhatsApp(number.replace(/\D/g, "") + "@s.whatsapp.net");
  return !!res?.[0]?.exists;
}

/**
 * Hapus session dari memory, DB, dan folder
 */
export async function deleteSession(sessionId) {
  try {
    const sock = sessions.get(sessionId);
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {
        console.warn(`⚠️ Logout gagal: ${e.message}`);
      }
      sessions.delete(sessionId);
    }

    await Session.destroy({ where: { sessionId } });

    const folder = path.join(SESSION_ROOT, sessionId);
    if (fs.existsSync(folder)) {
      fs.rmSync(folder, { recursive: true, force: true });
      console.log(`🗑️ Folder ${folder} deleted`);
    } else {
      console.log(`ℹ️ Folder ${folder} tidak ditemukan, skip`);
    }

    console.log(`✅ Session ${sessionId} deleted`);
    return true;
  } catch (err) {
    console.error("❌ Error deleteSession:", err.message);
    return false;
  }
}

/**
 * Restore semua session dari DB saat server start
 */
export async function initSessions(io) {
  const dbSessions = await Session.findAll();
  for (const s of dbSessions) {
    if (s.status === "connected" || s.status === "reconnecting") {
      console.log(`🔄 Restore session: ${s.sessionId} (mode=${s.mode || "qr"})`);
      await startSession(s.sessionId, io, s.mode || "qr", s.label);
    }
  }
}
