import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Campaign = sequelize.define("Campaign", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: DataTypes.STRING,
  templateId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.INTEGER, allowNull: false }, // ✅ INT supaya FK valid
  speedMinMs: { type: DataTypes.INTEGER, defaultValue: 5000 },
  speedMaxMs: { type: DataTypes.INTEGER, defaultValue: 15000 },
  status: { type: DataTypes.STRING, defaultValue: "idle" } // idle|running|done
});

export default Campaign;
