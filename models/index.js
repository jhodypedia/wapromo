import { sequelize } from "../config/db.js";
import User from "./User.js";
import Template from "./Template.js";
import Session from "./Session.js";
import Campaign from "./Campaign.js";
import Target from "./Target.js";

// User → Template
User.hasMany(Template, { foreignKey: "userId", as: "templates", onDelete: "CASCADE" });
Template.belongsTo(User, { foreignKey: "userId", as: "user" });

// User → Session
User.hasMany(Session, { foreignKey: "userId", as: "sessions", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "userId", as: "user" });

// User → Campaign
User.hasMany(Campaign, { foreignKey: "userId", as: "campaigns", onDelete: "CASCADE" });
Campaign.belongsTo(User, { foreignKey: "userId", as: "user" });

// Campaign → Template (❗ penting: SET NULL biar campaign tetap ada walau template dihapus)
Campaign.belongsTo(Template, { 
  foreignKey: "templateId", 
  as: "template", 
  onDelete: "SET NULL", 
  hooks: true 
});
Template.hasMany(Campaign, { 
  foreignKey: "templateId", 
  as: "campaigns" 
});

// Campaign → Target (❗ ikut hapus kalau campaign dihapus)
Campaign.hasMany(Target, { 
  foreignKey: "campaignId", 
  as: "targets", 
  onDelete: "CASCADE", 
  hooks: true 
});
Target.belongsTo(Campaign, { foreignKey: "campaignId", as: "campaign" });

// Campaign → Session
Campaign.belongsTo(Session, { 
  foreignKey: "sessionId", 
  as: "session", 
  onDelete: "SET NULL", 
  hooks: true 
});
Session.hasMany(Campaign, { foreignKey: "sessionId", as: "campaigns" });

export { sequelize, User, Template, Session, Campaign, Target };
