import express from "express";
import { authRequired } from "../middlewares/auth.js";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "../controllers/template.controller.js";

const router = express.Router();

router.get("/", authRequired, listTemplates);
router.post("/", authRequired, createTemplate);
router.put("/:id", authRequired, updateTemplate);
router.delete("/:id", authRequired, deleteTemplate);

export default router;
