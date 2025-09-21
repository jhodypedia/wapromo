import express from "express";
import { authRequired } from "../middlewares/auth.js";
import { listTemplates, createTemplateForm, createTemplate } from "../controllers/template.controller.js";
const router = express.Router();
router.get("/", authRequired, listTemplates);
router.get("/new", authRequired, createTemplateForm);
router.post("/new", authRequired, createTemplate);
export default router;
