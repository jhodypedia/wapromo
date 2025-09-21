import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import expressLayouts from "express-ejs-layouts";
import dotenv from "dotenv";
import { initDB, sequelize } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import generateRoutes from "./routes/generate.routes.js";
import waRoutes from "./routes/wa.routes.js";
import templateRoutes from "./routes/template.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import { authRequired } from "./middlewares/auth.js";
import { initSessions } from "./services/waService.js";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set("io", io);

// paths & views
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// session
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false
}));

// layouts
app.use(expressLayouts);
app.set("layout", "layouts/main");

// inject user to views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// routes
app.use("/auth", authRoutes);
app.use("/wa", waRoutes);
app.use("/templates", templateRoutes);
app.use("/campaigns", campaignRoutes);
app.use("/generate", generateRoutes);

// dashboard
app.get("/", authRequired, (req, res) => res.render("dashboard"));

// socket.io
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// db & start server
await initDB();
await sequelize.sync({ alter: true }); // auto update schema kalau ada field baru

// restore WA sessions dari DB
await initSessions(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
