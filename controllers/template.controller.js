import { Template } from "../models/index.js";

// List
export const listTemplates = async (req, res) => {
  const templates = await Template.findAll({ order: [["id", "DESC"]] });
  res.render("templates/list", { templates });
};

// Create
export const createTemplate = async (req, res) => {
  try {
    const { title, body, link, isActive } = req.body;
    const tpl = await Template.create({
      title,
      body,
      link,
      isActive: isActive === true || isActive === "true"
    });
    res.json({ success: true, template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// Update
export const updateTemplate = async (req, res) => {
  try {
    const tpl = await Template.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    const { title, body, link, isActive } = req.body;
    await tpl.update({
      title,
      body,
      link,
      isActive: isActive === true || isActive === "true"
    });

    res.json({ success: true, template: tpl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// Delete
export const deleteTemplate = async (req, res) => {
  try {
    const tpl = await Template.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ success: false, error: "Template tidak ditemukan" });

    await tpl.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
