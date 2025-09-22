// controllers/template.controller.js
import { Template } from "../models/index.js";
import { Op } from "sequelize";

/**
 * List semua template milik user
 */
export const listTemplates = async (req, res) => {
  try {
    const templates = await Template.findAll({
      where: { userId: req.session.user.id }, // 🔑 filter per user
      order: [["id", "DESC"]]
    });
    res.render("templates/list", { templates });
  } catch (e) {
    res.status(500).send(e.message);
  }
};

/**
 * Get detail template (AJAX)
 */
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tpl = await Template.findOne({
      where: { id, userId: req.session.user.id } // 🔑 filter per user
    });
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    res.json({ success: true, template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Create template
 */
export const createTemplate = async (req, res) => {
  try {
    const { title, body, link, isActive } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, error: "Judul dan isi wajib diisi" });
    }

    const tpl = await Template.create({
      userId: req.session.user.id,
      title,
      body,
      link,
      isActive: isActive === "true" || isActive === true
    });

    res.json({ success: true, msg: "Template berhasil ditambahkan", template: tpl });
  } catch (e) {
    console.error("Error createTemplate:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Update template
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, link, isActive } = req.body;

    const tpl = await Template.findOne({
      where: { id, userId: req.session.user.id } // 🔑 filter per user
    });
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    tpl.title = title;
    tpl.body = body;
    tpl.link = link;
    tpl.isActive = isActive === "true" || isActive === true;
    await tpl.save();

    res.json({ success: true, msg: "Template berhasil diperbarui", template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Delete template
 */

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Cari template sesuai user
    const tpl = await Template.findOne({
      where: { id, userId: req.session.user.id }
    });
    if (!tpl) {
      return res.status(404).json({ success: false, error: "Template tidak ditemukan" });
    }

    // ✅ Cek campaign yang pakai template ini
    const campaigns = await Campaign.findAll({
      where: { templateId: id }
    });

    // Kalau masih ada campaign yang BELUM selesai
    const aktif = campaigns.find(c => c.status !== "done");
    if (aktif) {
      return res.status(400).json({
        success: false,
        error: `Template dipakai oleh campaign "${aktif.name}" (status: ${aktif.status}). Hapus/ganti campaign dulu.`
      });
    }

    // ✅ Kalau aman → hapus
    await tpl.destroy();

    res.json({ success: true, msg: "Template berhasil dihapus" });
  } catch (e) {
    console.error("❌ deleteTemplate error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
