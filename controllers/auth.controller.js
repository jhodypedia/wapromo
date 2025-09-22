import bcrypt from "bcrypt";
import { User } from "../models/index.js";

export const getLogin = (req, res) => {
  res.render("auth/login");
};

export const getRegister = (req, res) => {
  res.render("auth/register");
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ where: { email } });

    if (!u) {
      return req.xhr || req.headers.accept.includes("json")
        ? res.status(400).json({ success: false, error: "Email tidak ditemukan" })
        : res.render("auth/login", { error: "Email tidak ditemukan" });
    }

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) {
      return req.xhr || req.headers.accept.includes("json")
        ? res.status(400).json({ success: false, error: "Password salah" })
        : res.render("auth/login", { error: "Password salah" });
    }

    req.session.user = { id: u.id, name: u.name, email: u.email };

    return req.xhr || req.headers.accept.includes("json")
      ? res.json({ success: true, msg: "Login berhasil", user: req.session.user })
      : res.redirect("/");
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ where: { email } });

    if (exists) {
      return req.xhr || req.headers.accept.includes("json")
        ? res.status(400).json({ success: false, error: "Email sudah digunakan" })
        : res.render("auth/register", { error: "Email sudah digunakan" });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hash });

    return req.xhr || req.headers.accept.includes("json")
      ? res.json({ success: true, msg: "Registrasi berhasil", user: { id: newUser.id, name: newUser.name, email: newUser.email } })
      : res.redirect("/auth/login");
  } catch (e) {
    console.error("Register error:", e);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const logout = (req, res) => {
  req.session.destroy(() => {
    return req.xhr || req.headers.accept.includes("json")
      ? res.json({ success: true, msg: "Logout berhasil" })
      : res.redirect("/auth/login");
  });
};
