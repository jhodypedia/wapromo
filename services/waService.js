import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Session } from "../models/index.js";

const sessions = {}; // sessionId -> socket

export async function startSession(sessionId, io) {
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // QR dikirim ke frontend via socket
  });

  sessions[sessionId] = sock;
  await Session.upsert({ sessionId, status: "connecting" });
  io.emit("wa_status", { sessionId, status: "connecting" });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) io.emit("wa_qr", { sessionId, qr });

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
        startSession(sessionId, io); // auto reconnect
      } else {
        delete sessions[sessionId];
      }
    }
  });
}

export function getSession(sessionId) {
  return sessions[sessionId] || null;
}

// Pairing 6 digit
export async function getPairingCode(sessionId, phoneNumber) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");
  const jid = phoneNumber.replace(/\D/g, "") + "@s.whatsapp.net";
  const code = await sock.requestPairingCode(jid); // 6 digit
  return code;
}

// Cek nomor aktif (exists di WhatsApp)
export async function checkWaNumber(sessionId, number) {
  const sock = getSession(sessionId);
  if (!sock) throw new Error("Session belum aktif");
  const res = await sock.onWhatsApp(number.replace(/\D/g, "") + "@s.whatsapp.net");
  return !!res?.[0]?.exists;
}
