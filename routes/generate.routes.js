import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { generate, renderGeneratePage } from "../controllers/generate.controller.js";

const router = express.Router();

// Halaman utama (EJS)
router.get("/", authRequired, renderGeneratePage);

// API generate (AJAX)
router.post("/", authRequired, generate);

export default router;
