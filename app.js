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

// 🔹 Import models untuk statistik dashboard
import { Session, Campaign, Template, Target } from "./models/index.js";

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

// 🔹 dashboard dengan statistik & campaign terbaru
app.get("/", authRequired, async (req, res) => {
  try {
    const stats = {
      sessions: await Session.count(),
      campaigns: await Campaign.count(),
      templates: await Template.count(),
      targets: await Target.count(),
    };

    const recentCampaigns = await Campaign.findAll({
      include: [{ model: Template, as: "template" }],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.render("dashboard", {
      user: req.session.user,
      stats,
      recentCampaigns
    });
  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.render("dashboard", {
      user: req.session.user,
      stats: { sessions: 0, campaigns: 0, templates: 0, targets: 0 },
      recentCampaigns: [],
      error: err.message
    });
  }
});

// socket.io
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// db & start server
await initDB();
await sequelize.sync({ alter: true });

// restore WA sessions dari DB
await initSessions(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
