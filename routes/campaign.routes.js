import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { Campaign, Template, Target, Session } from "../models/index.js";
import { getSession } from "../services/waService.js";

const router = express.Router();

// simpan state worker di memory
const workers = new Map();

/**
 * Halaman list (EJS)
 */
router.get("/", authRequired, async (req, res) => {
  const [campaigns, templates, sessions] = await Promise.all([
    Campaign.findAll({
      where: { userId: req.session.user.id },
      include: [
        { model: Template, as: "template" },
        { model: Target, as: "targets" },
        { model: Session, as: "session" }
      ],
      order: [["id", "DESC"]]
    }),
    Template.findAll({ where: { isActive: true } }),
    Session.findAll()
  ]);
  res.render("campaign/list", { campaigns, templates, sessions });
});

/**
 * API: Create campaign
 */
router.post("/new", authRequired, async (req, res) => {
  try {
    const { name, templateId, sessionId, numbers, speedMinMs, speedMaxMs } = req.body;

    const cp = await Campaign.create({
      name,
      userId: req.session.user.id,
      templateId,
      sessionId,
      status: "idle",
      speedMinMs: parseInt(speedMinMs) || 5000,
      speedMaxMs: parseInt(speedMaxMs) || 15000
    });

    if (numbers) {
      const rows = numbers.split("\n").map(n => n.trim()).filter(Boolean);
      for (const num of rows) {
        await Target.create({ campaignId: cp.id, number: num, status: "valid" });
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: List JSON
 */
router.get("/list", authRequired, async (req, res) => {
  const campaigns = await Campaign.findAll({
    where: { userId: req.session.user.id },
    include: [
      { model: Template, as: "template" },
      { model: Target, as: "targets" },
      { model: Session, as: "session" }
    ],
    order: [["id", "DESC"]]
  });
  res.json(campaigns);
});

/**
 * API: Detail JSON
 */
router.get("/:id/detail", authRequired, async (req, res) => {
  const { id } = req.params;
  const cp = await Campaign.findOne({
    where: { id, userId: req.session.user.id },
    include: [
      { model: Template, as: "template" },
      { model: Target, as: "targets" },
      { model: Session, as: "session" }
    ]
  });
  if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });
  res.json({ success: true, campaign: cp });
});

/**
 * API: Delete campaign
 */
router.delete("/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const cp = await Campaign.findOne({ where: { id, userId: req.session.user.id } });
  if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

  await Target.destroy({ where: { campaignId: cp.id } });
  await cp.destroy();

  res.json({ success: true });
});

/**
 * Jalankan campaign
 */
router.post("/:id/run", authRequired, async (req, res) => {
  const { id } = req.params;
  const io = req.app.get("io");

  const cp = await Campaign.findOne({
    where: { id, userId: req.session.user.id },
    include: [{ model: Template, as: "template" }, { model: Session, as: "session" }]
  });
  if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

  const sock = getSession(cp.session.sessionId);
  if (!sock) return res.status(400).json({ success: false, error: "Session WA belum aktif" });

  const targets = await Target.findAll({
    where: { campaignId: cp.id, status: "valid" },
    order: [["id", "ASC"]]
  });

  cp.status = "running";
  await cp.save();

  workers.set(cp.id, { stopped: false });

  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const message = cp.template.body + (cp.template.link ? `\n👉 ${cp.template.link}` : "");

  (async () => {
    for (const t of targets) {
      const state = workers.get(cp.id);
      if (!state || state.stopped) break;

      io.emit("campaign_progress", { campaignId: cp.id, targetId: t.id, number: t.number, status: "processing" });

      try {
        await sock.sendMessage(t.number.replace(/\D/g, "") + "@s.whatsapp.net", { text: message });
        t.status = "success";
        t.error = null;
        await t.save();
        io.emit("campaign_progress", { campaignId: cp.id, targetId: t.id, number: t.number, status: "success" });
      } catch (e) {
        t.status = "error";
        t.error = String(e?.message || e);
        await t.save();
        io.emit("campaign_progress", { campaignId: cp.id, targetId: t.id, number: t.number, status: "error" });
      }
      await new Promise(r => setTimeout(r, rand(cp.speedMinMs, cp.speedMaxMs)));
    }

    const state = workers.get(cp.id);
    if (state && state.stopped) {
      cp.status = "stopped";
      await cp.save();
      io.emit("campaign_stopped", { campaignId: cp.id });
    } else {
      cp.status = "done";
      await cp.save();
      io.emit("campaign_done", { campaignId: cp.id });
    }
    workers.delete(cp.id);
  })();

  res.json({ success: true });
});

/**
 * Hentikan campaign
 */
router.post("/:id/stop", authRequired, async (req, res) => {
  const { id } = req.params;
  const cp = await Campaign.findOne({ where: { id, userId: req.session.user.id } });
  if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

  cp.status = "stopped";
  await cp.save();

  if (workers.has(cp.id)) workers.get(cp.id).stopped = true;

  req.app.get("io").emit("campaign_stopped", { campaignId: cp.id });
  res.json({ success: true, msg: "Campaign dihentikan" });
});

export default router;
