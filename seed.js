import bcrypt from "bcrypt";
import { sequelize, User, Template } from "./models/index.js";

await sequelize.sync();

const email="admin@example.com";
let u = await User.findOne({ where:{ email } });
if(!u){
  const hash = await bcrypt.hash("admin123",10);
  u = await User.create({ name:"Admin", email, password: hash });
  console.log("✅ Admin:", email, "/ admin123");
}

if(!await Template.count()){
  await Template.bulkCreate([
    { title:"Promo Shopee", body:"🔥 Diskon hingga 70% hanya hari ini!", link:"https://shopee.co.id/promo" },
    { title:"Flash Sale", body:"⚡ Flash Sale mulai sebentar lagi! Gaskeun!", link:"https://shopee.co.id/flash" }
  ]);
  console.log("✅ Templates seeded");
}

process.exit(0);
