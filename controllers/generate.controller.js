import { generateNumbers, operatorPrefixes } from "../services/numberGenerator.js";

/**
 * API: generate nomor (balik JSON untuk AJAX)
 */
export const generate = async (req, res) => {
  try {
    const { operator, count, length } = req.body;
    if (!operator || !count || !length) {
      return res.status(400).json({ success: false, error: "Data tidak lengkap" });
    }

    const numbers = generateNumbers(operator, parseInt(count), parseInt(length));
    res.json({ success: true, numbers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Render halaman generate (EJS)
 */
export const renderGeneratePage = (req, res) => {
  res.render("generate/index", { operators: Object.keys(operatorPrefixes) });
};
