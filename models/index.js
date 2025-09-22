import { sequelize } from "../config/db.js";
import User from "./User.js";
import Template from "./Template.js";
import Session from "./Session.js";
import Campaign from "./Campaign.js";
import Target from "./Target.js";

// === RELASI USER ===
User.hasMany(Template, { foreignKey: "userId", as: "templates" });
Template.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
Session.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Campaign, { foreignKey: "userId", as: "campaigns" });
Campaign.belongsTo(User, { foreignKey: "userId", as: "user" });

// === RELASI TEMPLATE ↔ CAMPAIGN ===
Template.hasMany(Campaign, {
  foreignKey: { name: "templateId", allowNull: false },
  as: "campaigns",
  onDelete: "RESTRICT",   // 🚫 tidak boleh auto delete
  onUpdate: "CASCADE"
});
Campaign.belongsTo(Template, {
  foreignKey: { name: "templateId", allowNull: false },
  as: "template",
  onDelete: "RESTRICT",   // 🚫 kalau template dipakai, larang hapus
  onUpdate: "CASCADE"
});

// === RELASI CAMPAIGN ↔ TARGET ===
Campaign.hasMany(Target, { foreignKey: "campaignId", as: "targets" });
Target.belongsTo(Campaign, { foreignKey: "campaignId", as: "campaign" });

// === RELASI CAMPAIGN ↔ SESSION ===
Session.hasMany(Campaign, { foreignKey: "sessionId", as: "campaigns" });
Campaign.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

export { sequelize, User, Template, Session, Campaign, Target };
