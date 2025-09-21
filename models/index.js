import { sequelize } from "../config/db.js";
import User from "./User.js";
import Template from "./Template.js";
import Session from "./Session.js";
import Campaign from "./Campaign.js";
import Target from "./Target.js";

// Campaign milik User & Template
Campaign.belongsTo(User, { foreignKey: "userId", as: "user" });
Campaign.belongsTo(Template, { foreignKey: "templateId", as: "template" });

// Campaign punya banyak Target
Campaign.hasMany(Target, { foreignKey: "campaignId", as: "targets" });
Target.belongsTo(Campaign, { foreignKey: "campaignId", as: "campaign" });

// (opsional) kalau campaign terhubung ke session
Campaign.belongsTo(Session, { foreignKey: "sessionId", as: "session" });
Session.hasMany(Campaign, { foreignKey: "sessionId", as: "campaigns" });

export { sequelize, User, Template, Session, Campaign, Target };
