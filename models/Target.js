import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
const Target = sequelize.define("Target", {
  campaignId: DataTypes.INTEGER,
  number: DataTypes.STRING,                   // 62xxxx
  status: { type: DataTypes.STRING, defaultValue: "pending" }, // pending|valid|invalid|success|error
  error: DataTypes.TEXT
});
export default Target;
