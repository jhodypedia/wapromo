import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Session = sequelize.define("Session", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sessionId: { type: DataTypes.STRING, unique: true }, // id eksternal WA
  label: DataTypes.STRING, // nama friendly untuk ditampilkan di UI
  mode: {                  // mode koneksi
    type: DataTypes.ENUM("qr", "pairing"),
    defaultValue: "qr"
  },
  status: {                // status koneksi
    type: DataTypes.ENUM("connected", "reconnecting", "disconnected", "connecting"),
    defaultValue: "disconnected"
  }
});

export default Session;
