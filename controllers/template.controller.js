// controllers/template.controller.js
import { Template } from "../models/index.js";

/**
 * List semua template (untuk render EJS)
 */
export const listTemplates = async (req, res) => {
  try {
    const templates = await Template.findAll({ order: [["id", "DESC"]] });
    res.render("templates/list", { templates });
  } catch (e) {
    res.status(500).send(e.message);
  }
};

/**
 * Ambil detail template (AJAX GET /templates/:id)
 */
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tpl = await Template.findByPk(id);
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    res.json({ success: true, template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Create template (AJAX POST /templates)
 */
export const createTemplate = async (req, res) => {
  try {
    const { title, body, link, isActive } = req.body;
    const tpl = await Template.create({
      title,
      body,
      link,
      isActive: isActive === "true" || isActive === true
    });

    res.json({ success: true, msg: "Template berhasil ditambahkan", template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Update template (AJAX PUT /templates/:id)
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, link, isActive } = req.body;

    const tpl = await Template.findByPk(id);
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
 * Delete template (AJAX DELETE /templates/:id)
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tpl = await Template.findByPk(id);
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    await tpl.destroy();
    res.json({ success: true, msg: "Template berhasil dihapus" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
