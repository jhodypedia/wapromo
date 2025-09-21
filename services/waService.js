import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Session } from "../models/index.js";

const sessions = new Map(); // sessionId → sock aktif

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Mulai session WA baru
 * @param {string} sessionId - session unik
 * @param {object} io - socket.io instance
 * @param {"qr"|"pairing"} mode - mode koneksi
 * @param {string} [label] - label opsional untuk identifikasi
 */
export async function startSession(sessionId, io, mode = "qr", label = null) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

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
        // hanya kirim QR jika mode qr
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
 * Ambil socket aktif dari memory
 */
export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Generate Pairing Code (8 digit)
 */
export async function getPairingCode(sessionId, phoneNumber) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const jid = phoneNumber.replace(/\D/g, "") + "@s.whatsapp.net";

  // kasih jeda supaya socket siap
  await delay(6000);

  try {
    let code = await sock.requestPairingCode(jid);

    // ambil hanya digit, fix jadi 8 digit
    code = (code.match(/\d/g) || []).join("").slice(0, 8);
    if (code.length < 8) code = code.padEnd(8, "0");

    return code;
  } catch (err) {
    throw new Error("Gagal generate pairing code: " + err.message);
  }
}

/**
 * Cek nomor apakah valid di WhatsApp
 */
export async function checkWaNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const res = await sock.onWhatsApp(number.replace(/\D/g, "") + "@s.whatsapp.net");
  return !!res?.[0]?.exists;
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
