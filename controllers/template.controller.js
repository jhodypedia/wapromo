// controllers/template.controller.js
import { Template } from "../models/index.js";

/**
 * List semua template
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
 * Form create
 */
export const createTemplateForm = (req, res) => {
  res.render("templates/new");
};

/**
 * Create baru
 */
export const createTemplate = async (req, res) => {
  try {
    const { title, body, link } = req.body;
    await Template.create({ title, body, link, isActive: true });
    res.redirect("/templates");
  } catch (e) {
    res.status(500).send(e.message);
  }
};

/**
 * Update template (AJAX PUT)
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

    res.json({ success: true, template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Delete template (AJAX DELETE)
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const tpl = await Template.findByPk(id);
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    await tpl.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
