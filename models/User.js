// models/User.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const User = sequelize.define("User", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false,       // 🔑 jangan boleh null
    unique: true,           // 🔑 pastikan unik
    validate: {
      isEmail: true         // 🔑 validasi format email
    }
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }
}, {
  tableName: "users",       // biar jelas nama tabelnya
  timestamps: true          // otomatis bikin createdAt & updatedAt
});

export default User;
