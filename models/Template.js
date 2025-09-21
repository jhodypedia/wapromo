import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Template = sequelize.define("Template", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: DataTypes.STRING,
  body: DataTypes.TEXT,    // pesan utama
  link: DataTypes.STRING,  // link opsional
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

export default Template;
