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
  const sessions = await Session.findAll({
    where: { userId: req.session.user.id },
    order: [["id", "DESC"]]
  });
  res.render("wa/connect", { sessions });
});

/**
 * API: daftar session
 */
router.get("/connect/list", authRequired, async (req, res) => {
  try {
    const sessions = await Session.findAll({
      where: { userId: req.session.user.id },
      order: [["id", "DESC"]]
    });
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

    await Session.upsert({
      sessionId,
      label,
      mode: selectedMode,
      status: "connecting",
      userId: req.session.user.id
    });

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

    let session = await Session.findOne({
      where: { sessionId, userId: req.session.user.id }
    });

    if (!session) {
      session = await Session.create({
        sessionId,
        label: sessionId,
        mode: "pairing",
        status: "connecting",
        userId: req.session.user.id
      });
      startSession(sessionId, io, "pairing", sessionId);
    }

    const code = await getPairingCode(sessionId, phone, io);
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
 * API: hapus session
 */
router.delete("/:sessionId", authRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      where: { sessionId, userId: req.session.user.id }
    });
    if (!session) {
      return res.status(404).json({ success: false, error: "Session tidak ditemukan" });
    }

    const ok = await deleteSession(sessionId);
    if (!ok) {
      return res.status(500).json({ success: false, error: "Gagal hapus session" });
    }

    await session.destroy();
    res.json({ success: true, msg: `Session ${sessionId} berhasil dihapus` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
