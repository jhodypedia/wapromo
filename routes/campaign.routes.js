import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { Campaign, Template, Target } from "../models/index.js";
import { getSession } from "../services/waService.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const campaigns = await Campaign.findAll({ include:[Template, Target], order:[["id","DESC"]] });
  res.render("campaign/list", { campaigns });
});

router.get("/new", authRequired, async (req, res) => {
  const templates = await Template.findAll({ where:{ isActive:true } });
  res.render("campaign/new", { templates, error:null });
});

router.post("/new", authRequired, async (req, res) => {
  const { name, templateId, sessionId, numbers, speedMinMs, speedMaxMs } = req.body;
  const sock = getSession(sessionId);
  if(!sock) return res.render("campaign/new", { templates: await Template.findAll({ where:{isActive:true} }), error: "Session WA belum aktif" });

  const cp = await Campaign.create({
    name, templateId, sessionId, userId: req.session.user.id,
    speedMinMs: parseInt(speedMinMs)||5000,
    speedMaxMs: parseInt(speedMaxMs)||15000,
    status: "idle"
  });

  const io = req.app.get("io");
  const rows = (numbers||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

  for (const r of rows) {
    const t = await Target.create({ campaignId: cp.id, number: r, status: "pending" });
    try {
      const resu = await sock.onWhatsApp(r.replace(/\D/g,"") + "@s.whatsapp.net");
      t.status = resu?.[0]?.exists ? "valid" : "invalid";
      await t.save();
      io.emit("number_checked", { campaignId: cp.id, number: r, status: t.status });
    } catch (e) {
      t.status = "invalid"; t.error = String(e?.message || e); await t.save();
      io.emit("number_checked", { campaignId: cp.id, number: r, status: "invalid" });
    }
  }

  res.redirect("/campaigns");
});

router.post("/:id/run", authRequired, async (req, res) => {
  const { id } = req.params;
  const io = req.app.get("io");
  const cp = await Campaign.findByPk(id, { include: [Template] });
  if (!cp) return res.status(404).send("Campaign not found");

  const sock = getSession(cp.sessionId);
  if (!sock) return res.status(400).send("Session WA belum aktif");

  const targets = await Target.findAll({ where: { campaignId: cp.id, status: "valid" }, order:[["id","ASC"]] });

  cp.status = "running"; await cp.save();
  const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

  const message = cp.Template.body + (cp.Template.link ? `\n👉 ${cp.Template.link}` : "");

  (async () => {
    for (const t of targets) {
      try {
        await sock.sendMessage(t.number.replace(/\D/g,"") + "@s.whatsapp.net", { text: message });
        t.status = "success"; t.error = null; await t.save();
        io.emit("campaign_progress", { campaignId: cp.id, number: t.number, status: "success" });
      } catch (e) {
        t.status = "error"; t.error = String(e?.message || e); await t.save();
        io.emit("campaign_progress", { campaignId: cp.id, number: t.number, status: "error" });
      }
      await new Promise(r=>setTimeout(r, rand(cp.speedMinMs, cp.speedMaxMs)));
    }
    cp.status = "done"; await cp.save();
    io.emit("campaign_done", { campaignId: cp.id });
  })();

  res.redirect("/campaigns");
});

export default router;
