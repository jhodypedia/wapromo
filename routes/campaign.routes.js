// routes/campaign.routes.js
import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { Campaign, Template, Target, Session } from "../models/index.js";
import { getSession } from "../services/waService.js";

const router = express.Router();

/**
 * List campaigns (render EJS)
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const [campaigns, templates, sessions] = await Promise.all([
      Campaign.findAll({
        where: { userId: req.session.user.id }, // 🔑 filter user
        include: [
          { model: Template, as: "template" },
          { model: Target, as: "targets" },
          { model: Session, as: "session" }
        ],
        order: [["id", "DESC"]]
      }),
      Template.findAll({ where: { userId: req.session.user.id, isActive: true } }),
      Session.findAll({ where: { userId: req.session.user.id } })
    ]);

    res.render("campaign/list", { campaigns, templates, sessions });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/**
 * API: Create campaign
 */
router.post("/new", authRequired, async (req, res) => {
  try {
    const { name, templateId, sessionId, numbers, speedMinMs, speedMaxMs } = req.body;

    const cp = await Campaign.create({
      userId: req.session.user.id, // 🔑 pemilik campaign
      name,
      templateId,
      sessionId,
      status: "idle",
      speedMinMs: parseInt(speedMinMs) || 5000,
      speedMaxMs: parseInt(speedMaxMs) || 15000
    });

    if (numbers) {
      const rows = numbers.split("\n").map((n) => n.trim()).filter((n) => n);
      for (const num of rows) {
        await Target.create({
          userId: req.session.user.id, // 🔑 pemilik target
          campaignId: cp.id,
          number: num,
          status: "valid"
        });
      }
    }

    res.json({ success: true, msg: "Campaign berhasil dibuat" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: list campaign (JSON)
 */
router.get("/list", authRequired, async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { userId: req.session.user.id }, // 🔑 filter user
      include: [
        { model: Template, as: "template" },
        { model: Target, as: "targets" },
        { model: Session, as: "session" }
      ],
      order: [["id", "DESC"]]
    });
    res.json(campaigns);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: Detail campaign
 */
router.get("/:id/detail", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const cp = await Campaign.findOne({
      where: { id, userId: req.session.user.id }, // 🔑 filter user
      include: [
        { model: Template, as: "template" },
        { model: Target, as: "targets" },
        { model: Session, as: "session" }
      ]
    });
    if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

    res.json({ success: true, campaign: cp });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * API: Delete campaign
 */
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const cp = await Campaign.findOne({
      where: { id, userId: req.session.user.id } // 🔑 filter user
    });
    if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

    await Target.destroy({ where: { campaignId: cp.id, userId: req.session.user.id } });
    await cp.destroy();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * Jalankan campaign
 */
router.post("/:id/run", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get("io");

    const cp = await Campaign.findOne({
      where: { id, userId: req.session.user.id }, // 🔑 filter user
      include: [{ model: Template, as: "template" }, { model: Session, as: "session" }]
    });
    if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

    const sock = getSession(cp.session.sessionId);
    if (!sock) return res.status(400).json({ success: false, error: "Session WA belum aktif" });

    const targets = await Target.findAll({
      where: { campaignId: cp.id, userId: req.session.user.id, status: "valid" },
      order: [["id", "ASC"]]
    });

    cp.status = "running";
    await cp.save();

    const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const message = cp.template.body + (cp.template.link ? `\n👉 ${cp.template.link}` : "");

    (async () => {
      for (const t of targets) {
        if (cp.status === "stopped") break; // 🔑 jika dihentikan
        try {
          await sock.sendMessage(
            t.number.replace(/\D/g, "") + "@s.whatsapp.net",
            { text: message }
          );
          t.status = "success";
          await t.save();
          io.emit("campaign_progress", { campaignId: cp.id, number: t.number, status: "success" });
        } catch (e) {
          t.status = "error";
          t.error = String(e?.message || e);
          await t.save();
          io.emit("campaign_progress", { campaignId: cp.id, number: t.number, status: "error" });
        }
        await new Promise((r) => setTimeout(r, rand(cp.speedMinMs, cp.speedMaxMs)));
      }
      if (cp.status !== "stopped") {
        cp.status = "done";
        await cp.save();
        io.emit("campaign_done", { campaignId: cp.id });
      }
    })();

    res.json({ success: true, msg: "Campaign running" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * Stop campaign
 */
router.post("/:id/stop", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const cp = await Campaign.findOne({
      where: { id, userId: req.session.user.id }
    });
    if (!cp) return res.status(404).json({ success: false, error: "Campaign tidak ditemukan" });

    cp.status = "stopped"; // 🔑 hentikan loop run
    await cp.save();

    res.json({ success: true, msg: "Campaign dihentikan" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
