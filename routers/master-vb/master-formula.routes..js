const express = require("express");
const masterFormulaRouter = express.Router();
const { authentication } = require("../../middlewares/authentication");
const { getPPIDescription, getPPIFormat, getOwner, getProduct, getPPIItems, getPPI, exportPPI, exportStatusPembuat, getPPIGridData } = require("../../controllers/master-vb/master-formula.controller");
const { createNewMasterFormulaTemplate, updateMasterFormulaTemplate } = require("../../controllers/master-vb/master-formula-template.controller");

// get Product
masterFormulaRouter.get("/ppi-desc", getPPIDescription);
masterFormulaRouter.get("/ppi-format", getPPIFormat);
masterFormulaRouter.get("/cb-owner", getOwner);
masterFormulaRouter.get("/product", getProduct);
masterFormulaRouter.get("/status-pembuat", getPPIItems);

masterFormulaRouter.get("/ppi", getPPI);
masterFormulaRouter.get("/ppi-export", exportPPI);
masterFormulaRouter.get("/ppi-formula", authentication, getPPIGridData);
masterFormulaRouter.get("/pembuat-export", exportStatusPembuat);

// template
masterFormulaRouter.post("/create-template", authentication, createNewMasterFormulaTemplate);
masterFormulaRouter.patch("/update-template", authentication, updateMasterFormulaTemplate);

module.exports = masterFormulaRouter