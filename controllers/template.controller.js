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

    // Cari template milik user
    const tpl = await Template.findOne({
      where: { id, userId: req.session.user.id }
    });
    if (!tpl) {
      return res.status(404).json({ success: false, error: "Template tidak ditemukan" });
    }

    // 🔑 Cek apakah ada campaign yang masih aktif (status ≠ done)
    const aktif = await Campaign.findOne({
      where: {
        templateId: id,
        status: { [Op.not]: "done" }
      }
    });

    if (aktif) {
      return res.status(400).json({
        success: false,
        error: "Template tidak bisa dihapus karena masih dipakai campaign yang belum selesai"
      });
    }

    // ✅ Kalau semua campaign done / tidak ada campaign
    await tpl.destroy();
    res.json({ success: true, msg: "Template berhasil dihapus" });
  } catch (e) {
    console.error("❌ deleteTemplate error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
