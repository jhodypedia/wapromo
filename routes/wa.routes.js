import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { startSession, getPairingCode, checkWaNumber } from "../services/waService.js";
import { Session } from "../models/index.js";

const router = express.Router();

/**
 * Halaman connect WhatsApp (UI EJS)
 */
router.get("/connect", authRequired, (req, res) => {
  res.render("wa/connect");
});

/**
 * API: daftar session (JSON)
 */
router.get("/connect/list", authRequired, async (req, res) => {
  try {
    const sessions = await Session.findAll({ order: [["id", "DESC"]] });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: start session baru (QR)
 */
router.post("/start", authRequired, async (req, res) => {
  try {
    const { sessionId, label } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, error: "SessionId wajib" });

    const io = req.app.get("io");
    await Session.upsert({ sessionId, label, status: "connecting" });

    startSession(sessionId, io);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: generate pairing code (6 digit)
 */
router.post("/pairing", authRequired, async (req, res) => {
  try {
    const { sessionId, phone } = req.body;
    if (!sessionId || !phone) {
      return res.status(400).json({ success: false, error: "SessionId dan nomor WA wajib" });
    }

    // Pastikan session sudah ada, kalau belum → buat
    let session = await Session.findOne({ where: { sessionId } });
    if (!session) {
      const io = req.app.get("io");
      await Session.create({ sessionId, label: sessionId, status: "connecting" });
      startSession(sessionId, io);
      // beri delay biar socket siap
      setTimeout(async () => {
        try {
          const code = await getPairingCode(sessionId, phone);
          res.json({ success: true, code });
        } catch (err) {
          res.status(400).json({ success: false, error: err.message });
        }
      }, 1500);
    } else {
      const code = await getPairingCode(sessionId, phone);
      res.json({ success: true, code });
    }
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * API: cek nomor aktif WA
 */
router.post("/check", authRequired, async (req, res) => {
  try {
    const { sessionId, number } = req.body;
    if (!sessionId || !number) {
      return res.status(400).json({ success: false, error: "SessionId & nomor wajib" });
    }

    const exists = await checkWaNumber(sessionId, number);
    res.json({ success: true, number, exists });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

export default router;
