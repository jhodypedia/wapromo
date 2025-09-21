import bcrypt from "bcrypt";
import { User } from "../models/index.js";

export const getLogin = (req,res)=>res.render("auth/login");
export const getRegister = (req,res)=>res.render("auth/register");

export const postLogin = async (req,res)=>{
  const {email,password}=req.body;
  const u=await User.findOne({where:{email}});
  if(!u) return res.render("auth/login",{error:"Email tidak ditemukan"});
  const ok=await bcrypt.compare(password,u.password);
  if(!ok) return res.render("auth/login",{error:"Password salah"});
  req.session.user={id:u.id,name:u.name,email:u.email};
  res.redirect("/");
};

export const postRegister = async (req,res)=>{
  const {name,email,password}=req.body;
  const exists=await User.findOne({where:{email}});
  if(exists) return res.render("auth/register",{error:"Email sudah digunakan"});
  const hash=await bcrypt.hash(password,10);
  await User.create({name,email,password:hash});
  res.redirect("/auth/login");
};

export const logout=(req,res)=>{ req.session.destroy(()=>res.redirect("/auth/login")); }
