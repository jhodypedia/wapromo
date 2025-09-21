import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { startSession, getSession, getPairingCode } from "../services/waService.js";
import { Session } from "../models/index.js";

const router = express.Router();

router.get("/connect", authRequired, async (req, res) => {
  const sessions = await Session.findAll({ order:[["id","DESC"]] });
  res.render("wa/connect", { sessions });
});

router.post("/start", authRequired, async (req, res) => {
  const { sessionId, label } = req.body;
  const io = req.app.get("io");
  await Session.upsert({ sessionId, label, status: "connecting" });
  startSession(sessionId, io);
  res.redirect("/wa/connect");
});

router.post("/pairing", authRequired, async (req, res) => {
  const { sessionId, phone } = req.body;
  try {
    const code = await getPairingCode(sessionId, phone);
    res.json({ success: true, code });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

export default router;
