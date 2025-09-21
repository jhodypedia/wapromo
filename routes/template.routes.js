// routes/template.routes.js
import express from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "../controllers/template.controller.js";

const router = express.Router();

// EJS render
router.get("/", authRequired, listTemplates);

// API JSON
router.get("/:id", authRequired, getTemplate);
router.post("/", authRequired, createTemplate);
router.put("/:id", authRequired, updateTemplate);
router.delete("/:id", authRequired, deleteTemplate);

export default router;
