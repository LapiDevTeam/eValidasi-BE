const express = require("express");
const masterFormulaRouter = express.Router();
const { authentication } = require("../../middlewares/authentication");
const { getPPIDescription, getPPIFormat, getOwner, getProduct, getPPIItems } = require("../../controllers/master-vb/master-formula.controller");

// get Product
masterFormulaRouter.get("/ppi-desc", getPPIDescription);
masterFormulaRouter.get("/ppi-format", getPPIFormat);
masterFormulaRouter.get("/cb-owner", getOwner);
masterFormulaRouter.get("/product", getProduct);
masterFormulaRouter.get("/status-pembuat", getPPIItems);



module.exports = masterFormulaRouter