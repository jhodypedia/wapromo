import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
const Campaign = sequelize.define("Campaign", {
  name: DataTypes.STRING,
  templateId: DataTypes.INTEGER,
  userId: DataTypes.INTEGER,
  sessionId: DataTypes.STRING,
  speedMinMs: { type: DataTypes.INTEGER, defaultValue: 5000 },
  speedMaxMs: { type: DataTypes.INTEGER, defaultValue: 15000 },
  status: { type: DataTypes.STRING, defaultValue: "idle" } // idle|running|done
});
export default Campaign;
