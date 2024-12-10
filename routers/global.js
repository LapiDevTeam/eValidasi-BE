const express = require("express");
const GlobalController = require("../controllers/global-controller");
const globalRouter = express.Router();

// Fetch Group Code
globalRouter.get("/group-code", GlobalController.fetchGroupCode);

// fetch ITEM UNIT ID
globalRouter.get("/item-unit", GlobalController.fetchItemUnit);

module.exports = globalRouter;
