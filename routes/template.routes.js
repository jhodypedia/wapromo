import express from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  listTemplates,
  createTemplateForm,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "../controllers/template.controller.js";

const router = express.Router();

router.get("/", authRequired, listTemplates);
router.get("/new", authRequired, createTemplateForm);
router.post("/new", authRequired, createTemplate);
router.put("/:id", authRequired, updateTemplate);   // ✅ update
router.delete("/:id", authRequired, deleteTemplate); // ✅ delete

export default router;
