import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
const Template = sequelize.define("Template", {
  title: DataTypes.STRING,
  body: DataTypes.TEXT,     // tanpa link
  link: DataTypes.STRING,   // link dipisah
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});
export default Template;
