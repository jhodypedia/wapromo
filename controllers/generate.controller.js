import { generateNumbers } from "../utils/generator.js"; // fungsi yg kamu buat (sudah dimodif prefix 62)

/**
 * Generate nomor (AJAX)
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
export const renderGeneratePage = async (req, res) => {
  const operators = Object.keys((await import("../utils/generator.js")).operatorPrefixes);
  res.render("generate/index", { operators });
};
