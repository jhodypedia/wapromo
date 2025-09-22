import { sequelize } from "../config/db.js";
import User from "./User.js";
import Template from "./Template.js";
import Session from "./Session.js";
import Campaign from "./Campaign.js";
import Target from "./Target.js";

// User punya banyak Template
User.hasMany(Template, { foreignKey: "userId", as: "templates" });
Template.belongsTo(User, { foreignKey: "userId", as: "user" });

// User punya banyak Session
User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
Session.belongsTo(User, { foreignKey: "userId", as: "user" });

// User punya banyak Campaign
User.hasMany(Campaign, { foreignKey: "userId", as: "campaigns" });
Campaign.belongsTo(User, { foreignKey: "userId", as: "user" });

// Campaign → Template
Campaign.belongsTo(Template, { foreignKey: "templateId", as: "template" });
Template.hasMany(Campaign, { foreignKey: "templateId", as: "campaigns" });

// Campaign → Target
Campaign.hasMany(Target, { foreignKey: "campaignId", as: "targets" });
Target.belongsTo(Campaign, { foreignKey: "campaignId", as: "campaign" });

// Campaign → Session
Campaign.belongsTo(Session, { foreignKey: "sessionId", as: "session" });
Session.hasMany(Campaign, { foreignKey: "sessionId", as: "campaigns" });

export { sequelize, User, Template, Session, Campaign, Target };
