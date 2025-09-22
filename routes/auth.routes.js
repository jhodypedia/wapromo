import express from "express";
import {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout
} from "../controllers/auth.controller.js";
import { guestOnly, authRequired } from "../middlewares/auth.js";

const router = express.Router();

// halaman form
router.get("/login", guestOnly, getLogin);
router.get("/register", guestOnly, getRegister);

// API AJAX + fallback
router.post("/login", guestOnly, postLogin);
router.post("/register", guestOnly, postRegister);

// logout
router.post("/logout", authRequired, logout);   // 🔄 lebih baik pakai POST untuk AJAX
router.get("/logout", authRequired, logout);    // fallback GET biar aman

export default router;
