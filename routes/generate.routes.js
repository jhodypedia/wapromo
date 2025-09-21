import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { generateNumbers, operatorPrefixes } from "../services/numberGenerator.js";

const router = express.Router();

/**
 * Halaman awal generate
 */
router.get("/", authRequired, (req, res) => {
  res.render("generate/index", { 
    operators: Object.keys(operatorPrefixes), 
    numbers: null, 
    error: null   // ✅ selalu ada
  });
});

/**
 * Proses generate
 */
router.post("/", authRequired, (req, res) => {
  const { operator, count, length } = req.body;
  try {
    const numbers = generateNumbers(
      operator, 
      parseInt(count) || 10, 
      parseInt(length) || 12
    );
    res.render("generate/index", { 
      operators: Object.keys(operatorPrefixes), 
      numbers, 
      error: null   // ✅ selalu ada
    });
  } catch (e) {
    res.render("generate/index", { 
      operators: Object.keys(operatorPrefixes), 
      numbers: [], 
      error: e.message   // ✅ selalu ada
    });
  }
});

export default router;
