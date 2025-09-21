import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
const Session = sequelize.define("Session", {
  sessionId: { type: DataTypes.STRING, unique: true },
  label: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: "disconnected" } // connected|reconnecting|disconnected
});
export default Session;
