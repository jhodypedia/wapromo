import bcrypt from "bcrypt";
import { User } from "../models/index.js";

// 🔹 Render login
export const getLogin = (req, res) => {
  res.render("auth/login");
};

// 🔹 Render register
export const getRegister = (req, res) => {
  res.render("auth/register");
};

// 🔹 Login
export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cari user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return handleResponse(req, res, 400, "Email tidak ditemukan");
    }

    // Cek password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return handleResponse(req, res, 400, "Password salah");
    }

    // Simpan session
    req.session.user = { id: user.id, name: user.name, email: user.email };

    return handleResponse(req, res, 200, "Login berhasil", req.session.user);
  } catch (err) {
    console.error("Login error:", err);
    return handleResponse(req, res, 500, "Server error");
  }
};

// 🔹 Register
export const postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Cek apakah email sudah dipakai
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return handleResponse(req, res, 400, "Email sudah digunakan");
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Buat user baru
    const newUser = await User.create({ name, email, password: hash });

    return handleResponse(req, res, 200, "Registrasi berhasil", {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email
    });
  } catch (err) {
    console.error("Register error:", err);
    return handleResponse(req, res, 500, "Server error");
  }
};

// 🔹 Logout
export const logout = (req, res) => {
  req.session.destroy(() => {
    return handleResponse(req, res, 200, "Logout berhasil");
  });
};

/**
 * 🔹 Helper function untuk handle response
 * Biar tidak copy-paste JSON / render di setiap handler
 */
function handleResponse(req, res, statusCode, msg, data = null) {
  const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.includes("json"));

  if (wantsJSON) {
    return res.status(statusCode).json({
      success: statusCode < 400,
      msg,
      ...(data ? { user: data } : {})
    });
  }

  if (statusCode >= 400) {
    return res.render(statusCode === 400 ? "auth/login" : "auth/register", { error: msg });
  }

  // default redirect kalau sukses
  return res.redirect(statusCode === 200 && msg === "Registrasi berhasil" ? "/auth/login" : "/");
}
