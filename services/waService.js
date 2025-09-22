import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Session } from "../models/index.js";
import fs from "fs";
import path from "path";

const sessions = new Map(); // sessionId → socket aktif

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Mulai session WA baru
 */
export async function startSession(sessionId, io, mode = "qr", label = null, userId) {
  try {
    console.log(`🚀 startSession: ${sessionId} (mode=${mode}, user=${userId})`);

    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    });

    sessions.set(sessionId, sock);

    await Session.upsert({ sessionId, label, status: "connecting", mode, userId });
    io.emit("wa_status", { sessionId, status: "connecting" });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      console.log(`📡 connection.update: ${sessionId} →`, { connection, hasQr: !!qr });

      if (mode === "qr" && qr) {
        await delay(6000);
        io.emit("wa_qr", { sessionId, qr });
      }

      if (connection === "open") {
        console.log(`✅ Session ${sessionId} connected`);
        await Session.upsert({ sessionId, label, status: "connected", mode, userId });
        io.emit("wa_status", { sessionId, status: "connected" });
      }

      if (connection === "close") {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        console.log(`⚠️ Session ${sessionId} closed (code=${code}, reconnect=${shouldReconnect})`);

        await Session.upsert({ sessionId, label, status: "disconnected", mode, userId });
        io.emit("wa_status", { sessionId, status: "disconnected" });

        if (shouldReconnect) {
          console.log(`🔄 Reconnecting ${sessionId}...`);
          await Session.upsert({ sessionId, label, status: "reconnecting", mode, userId });
          io.emit("wa_status", { sessionId, status: "reconnecting" });
          setTimeout(() => startSession(sessionId, io, mode, label, userId), 3000);
        } else {
          sessions.delete(sessionId);
        }
      }
    });
  } catch (err) {
    console.error(`❌ Error startSession(${sessionId}):`, err);
  }
}

/**
 * Ambil socket aktif
 */
export function getSession(sessionId) {
  console.log(`🔎 getSession(${sessionId}) →`, sessions.has(sessionId));
  return sessions.get(sessionId) || null;
}

/**
 * Generate Pairing Code
 */
export async function getPairingCode(sessionId, phoneNumber) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const jid = phoneNumber.replace(/\D/g, "") + "@s.whatsapp.net";
  console.log(`🔑 getPairingCode(${sessionId}, ${jid})`);

  await delay(6000);

  try {
    const code = await sock.requestPairingCode(jid);
    console.log(`✅ Pairing code generated for ${sessionId}:`, code);
    return code;
  } catch (err) {
    console.error(`❌ Gagal generate pairing code (${sessionId}):`, err);
    throw new Error("Gagal generate pairing code: " + err.message);
  }
}

/**
 * Cek nomor WhatsApp
 */
export async function checkWaNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const jid = number.replace(/\D/g, "") + "@s.whatsapp.net";
  console.log(`📞 checkWaNumber(${sessionId}, ${jid})`);

  const res = await sock.onWhatsApp(jid);
  console.log("📥 onWhatsApp response:", res);

  return !!res?.[0]?.exists;
}

/**
 * Hapus session dari memory, DB, dan folder
 */
export async function deleteSession(sessionId) {
  console.log(`🗑️ deleteSession: ${sessionId}`);
  try {
    const sock = sessions.get(sessionId);
    if (sock) {
      try {
        console.log(`📤 Logout socket: ${sessionId}`);
        await sock.logout();
      } catch (logoutErr) {
        console.error(`⚠️ Logout error (${sessionId}):`, logoutErr.message);
      }
      sessions.delete(sessionId);
    }

    const dbDel = await Session.destroy({ where: { sessionId } });
    console.log(`🗄️ DB delete (${sessionId}):`, dbDel);

    const folder = path.join(process.cwd(), "sessions", sessionId);
    if (fs.existsSync(folder)) {
      console.log(`📂 Removing folder: ${folder}`);
      fs.rmSync(folder, { recursive: true, force: true });
    } else {
      console.log(`ℹ️ Folder not found for ${sessionId}: ${folder}`);
    }

    console.log(`✅ Session ${sessionId} fully deleted`);
    return true;
  } catch (err) {
    console.error(`❌ Error deleteSession(${sessionId}):`, err);
    return false;
  }
}

/**
 * Restore session saat server start
 */
export async function initSessions(io) {
  console.log("🔄 initSessions: restoring from DB...");
  const dbSessions = await Session.findAll();
  for (const s of dbSessions) {
    console.log(`→ Found session: ${s.sessionId}, status=${s.status}`);
    if (s.status === "connected" || s.status === "reconnecting") {
      console.log(`🔄 Restoring ${s.sessionId} (mode=${s.mode || "qr"})`);
      await startSession(s.sessionId, io, s.mode || "qr", s.label, s.userId);
    }
  }
}
