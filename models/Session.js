import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Session = sequelize.define("Session", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sessionId: { type: DataTypes.STRING, unique: true }, // id eksternal WA
  label: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: "disconnected" } // connected|reconnecting|disconnected
});

export default Session;
