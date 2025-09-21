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
  console.log("📄 GET /wa/connect → render connect.ejs, sessions:", sessions.length);
  res.render("wa/connect", { sessions });
});

/**
 * API: daftar session
 */
router.get("/connect/list", authRequired, async (req, res) => {
  try {
    const sessions = await Session.findAll({ order: [["id", "DESC"]] });
    console.log("📡 GET /wa/connect/list →", sessions.length, "sessions");
    res.json(sessions);
  } catch (e) {
    console.error("❌ /wa/connect/list error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: start session baru
 */
router.post("/start", authRequired, async (req, res) => {
  try {
    const { sessionId, label, mode } = req.body;
    console.log("▶️ POST /wa/start:", req.body);

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "SessionId wajib" });
    }

    const io = req.app.get("io");
    const selectedMode = mode === "pairing" ? "pairing" : "qr";

    await Session.upsert({ sessionId, label, mode: selectedMode, status: "connecting" });

    startSession(sessionId, io, selectedMode, label);

    res.json({ success: true, msg: `Session ${sessionId} dimulai (${selectedMode})` });
  } catch (e) {
    console.error("❌ /wa/start error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: generate pairing code
 */
router.post("/pairing", authRequired, async (req, res) => {
  try {
    const { sessionId, phone } = req.body;
    console.log("▶️ POST /wa/pairing:", req.body);

    if (!sessionId || !phone) {
      return res.status(400).json({ success: false, error: "SessionId dan nomor WA wajib" });
    }

    const io = req.app.get("io");

    let session = await Session.findOne({ where: { sessionId } });
    if (!session) {
      console.log("ℹ️ Session belum ada, auto-create:", sessionId);
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
          console.log(`🔑 Try generate pairing code (attempt ${i}) for ${sessionId}`);
          const code = await getPairingCode(sessionId, phone);
          return code;
        } catch (err) {
          lastErr = err;
          console.error(`⚠️ Pairing attempt ${i} failed:`, err.message);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw lastErr;
    }

    const code = await tryGenerate(3);
    console.log(`✅ Pairing code OK for ${sessionId}: ${code}`);
    res.json({ success: true, code });
  } catch (e) {
    console.error("❌ /wa/pairing error:", e);
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * API: cek nomor aktif WA
 */
router.post("/check", authRequired, async (req, res) => {
  try {
    const { sessionId, number } = req.body;
    console.log("▶️ POST /wa/check:", req.body);

    if (!sessionId || !number) {
      return res.status(400).json({ success: false, error: "SessionId & nomor wajib" });
    }

    const exists = await checkWaNumber(sessionId, number);
    console.log(`📞 checkWaNumber(${sessionId}, ${number}) → ${exists}`);
    res.json({ success: true, number, exists });
  } catch (e) {
    console.error("❌ /wa/check error:", e);
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * API: hapus session
 */
router.delete("/:sessionId", authRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log("🗑️ DELETE /wa/:sessionId →", sessionId);

    const ok = await deleteSession(sessionId);

    if (!ok) {
      console.error(`❌ Gagal hapus session ${sessionId}`);
      return res.status(500).json({ success: false, error: "Gagal hapus session" });
    }

    res.json({ success: true, msg: `Session ${sessionId} berhasil dihapus` });
  } catch (e) {
    console.error("❌ /wa/:sessionId error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
