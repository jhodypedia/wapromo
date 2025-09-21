import express from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  startSession,
  getPairingCode,
  checkWaNumber,
  deleteSession
} from "../services/waService.js";
import { Session } from "../models/index.js";

const router = express.Router();

/**
 * Halaman connect WhatsApp
 */
router.get("/connect", authRequired, async (req, res) => {
  const sessions = await Session.findAll({ order: [["id", "DESC"]] });
  res.render("wa/connect", { sessions });
});

/**
 * API: daftar session
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
 * API: start session baru
 */
router.post("/start", authRequired, async (req, res) => {
  try {
    const { sessionId, label, mode } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "SessionId wajib" });
    }

    const io = req.app.get("io");
    const selectedMode = mode === "pairing" ? "pairing" : "qr";

    await Session.upsert({ sessionId, label, mode: selectedMode, status: "connecting" });

    startSession(sessionId, io, selectedMode, label);

    res.json({ success: true, msg: `Session ${sessionId} dimulai (${selectedMode})` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: generate pairing code
 */
router.post("/pairing", authRequired, async (req, res) => {
  try {
    const { sessionId, phone } = req.body;
    if (!sessionId || !phone) {
      return res.status(400).json({ success: false, error: "SessionId dan nomor WA wajib" });
    }

    const io = req.app.get("io");

    let session = await Session.findOne({ where: { sessionId } });
    if (!session) {
      session = await Session.create({
        sessionId,
        label: sessionId,
        mode: "pairing",
        status: "connecting"
      });
      startSession(sessionId, io, "pairing", sessionId);
    }

    async function tryGenerate(maxRetry = 3) {
      let lastErr;
      for (let i = 1; i <= maxRetry; i++) {
        try {
          const code = await getPairingCode(sessionId, phone);
          return code;
        } catch (err) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw lastErr;
    }

    const code = await tryGenerate(3);
    res.json({ success: true, code });
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

/**
 * API: hapus session (DB + memory + folder)
 */
router.delete("/:sessionId", authRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const ok = await deleteSession(sessionId);

    if (!ok) {
      return res.status(500).json({ success: false, error: "Gagal hapus session" });
    }

    res.json({ success: true, msg: `Session ${sessionId} berhasil dihapus` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
