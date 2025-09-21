import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Target = sequelize.define("Target", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campaignId: { type: DataTypes.INTEGER, allowNull: false },
  number: DataTypes.STRING,  // 62xxxx
  status: { 
    type: DataTypes.ENUM("pending", "valid", "invalid", "success", "error"),
    defaultValue: "pending"
  },
  error: DataTypes.TEXT
});

export default Target;
