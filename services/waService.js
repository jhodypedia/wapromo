import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Session } from "../models/index.js";

const sessions = {}; // Map sessionId → socket aktif

/**
 * Mulai session WA
 */
export async function startSession(sessionId, io) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false // QR kita kirim via socket ke frontend
    });

    sessions[sessionId] = sock;
    await Session.upsert({ sessionId, status: "connecting" });
    io.emit("wa_status", { sessionId, status: "connecting" });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        io.emit("wa_qr", { sessionId, qr });
      }

      if (connection === "open") {
        await Session.upsert({ sessionId, status: "connected" });
        io.emit("wa_status", { sessionId, status: "connected" });
      }

      if (connection === "close") {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        await Session.upsert({ sessionId, status: "disconnected" });
        io.emit("wa_status", { sessionId, status: "disconnected" });

        if (shouldReconnect) {
          await Session.upsert({ sessionId, status: "reconnecting" });
          io.emit("wa_status", { sessionId, status: "reconnecting" });
          setTimeout(() => startSession(sessionId, io), 2000);
        } else {
          delete sessions[sessionId];
        }
      }
    });
  } catch (err) {
    console.error("❌ Error startSession:", err.message);
  }
}

/**
 * Ambil socket aktif by sessionId
 */
export function getSession(sessionId) {
  return sessions[sessionId] || null;
}

/**
 * Generate Pairing Code (6 digit)
 */
export async function getPairingCode(sessionId, phoneNumber) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  // nomor WA → jid
  const jid = phoneNumber.replace(/\D/g, "") + "@s.whatsapp.net";

  try {
    const code = await sock.requestPairingCode(jid);
    return code;
  } catch (err) {
    throw new Error("Gagal generate pairing code: " + err.message);
  }
}

/**
 * Cek apakah nomor valid di WhatsApp
 */
export async function checkWaNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");

  const res = await sock.onWhatsApp(number.replace(/\D/g, "") + "@s.whatsapp.net");
  return !!res?.[0]?.exists;
}
