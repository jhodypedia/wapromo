import { Template } from "../models/index.js";
export const listTemplates=async(req,res)=>{
  const templates=await Template.findAll({order:[["id","DESC"]]});
  res.render("templates/list",{templates});
};
export const createTemplateForm=(req,res)=>res.render("templates/new");
export const createTemplate=async(req,res)=>{
  const {title,body,link}=req.body;
  await Template.create({title,body,link});
  res.redirect("/templates");
};
