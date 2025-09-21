import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { Campaign, Template, Target } from "../models/index.js";
import { getSession } from "../services/waService.js";

const router = express.Router();

/**
 * List semua campaign
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      include: [
        { model: Template, as: "template" },
        { model: Target, as: "targets" }
      ],
      order: [["id", "DESC"]]
    });
    res.render("campaign/list", { campaigns });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/**
 * Form campaign baru
 */
router.get("/new", authRequired, async (req, res) => {
  try {
    const templates = await Template.findAll({ where: { isActive: true } });
    res.render("campaign/new", { templates, error: null });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/**
 * Simpan campaign baru
 */
router.post("/new", authRequired, async (req, res) => {
  try {
    const { name, templateId, sessionId, numbers, speedMinMs, speedMaxMs } = req.body;

    const sock = getSession(sessionId);
    if (!sock) {
      return res.render("campaign/new", {
        templates: await Template.findAll({ where: { isActive: true } }),
        error: "Session WA belum aktif"
      });
    }

    // buat campaign
    const cp = await Campaign.create({
      name,
      templateId,
      sessionId,
      userId: req.session.user.id,
      speedMinMs: parseInt(speedMinMs) || 5000,
      speedMaxMs: parseInt(speedMaxMs) || 15000,
      status: "idle"
    });

    const io = req.app.get("io");

    // simpan target
    const rows = (numbers || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const r of rows) {
      const t = await Target.create({ campaignId: cp.id, number: r, status: "pending" });
      try {
        const resu = await sock.onWhatsApp(r.replace(/\D/g, "") + "@s.whatsapp.net");
        t.status = resu?.[0]?.exists ? "valid" : "invalid";
        await t.save();
        io.emit("number_checked", { campaignId: cp.id, number: r, status: t.status });
      } catch (e) {
        t.status = "invalid";
        t.error = String(e?.message || e);
        await t.save();
        io.emit("number_checked", { campaignId: cp.id, number: r, status: "invalid" });
      }
    }

    res.redirect("/campaigns");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

/**
 * Jalankan campaign (blast pesan)
 */
router.post("/:id/run", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get("io");

    const cp = await Campaign.findByPk(id, {
      include: [{ model: Template, as: "template" }]
    });
    if (!cp) return res.status(404).send("Campaign not found");

    const sock = getSession(cp.sessionId);
    if (!sock) return res.status(400).send("Session WA belum aktif");

    const targets = await Target.findAll({
      where: { campaignId: cp.id, status: "valid" },
      order: [["id", "ASC"]]
    });

    cp.status = "running";
    await cp.save();

    const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

    const message =
      cp.template.body + (cp.template.link ? `\n👉 ${cp.template.link}` : "");

    (async () => {
      for (const t of targets) {
        try {
          await sock.sendMessage(
            t.number.replace(/\D/g, "") + "@s.whatsapp.net",
            { text: message }
          );
          t.status = "success";
          t.error = null;
          await t.save();
          io.emit("campaign_progress", {
            campaignId: cp.id,
            number: t.number,
            status: "success"
          });
        } catch (e) {
          t.status = "error";
          t.error = String(e?.message || e);
          await t.save();
          io.emit("campaign_progress", {
            campaignId: cp.id,
            number: t.number,
            status: "error"
          });
        }
        await new Promise((r) =>
          setTimeout(r, rand(cp.speedMinMs, cp.speedMaxMs))
        );
      }
      cp.status = "done";
      await cp.save();
      io.emit("campaign_done", { campaignId: cp.id });
    })();

    res.redirect("/campaigns");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

export default router;
