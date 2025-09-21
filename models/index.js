import { sequelize } from "../config/db.js";
import User from "./User.js";
import Template from "./Template.js";
import Session from "./Session.js";
import Campaign from "./Campaign.js";
import Target from "./Target.js";

Campaign.belongsTo(User, { foreignKey: "userId" });
Campaign.belongsTo(Template, { foreignKey: "templateId" });
Target.belongsTo(Campaign, { foreignKey: "campaignId" });

export { sequelize, User, Template, Session, Campaign, Target };
