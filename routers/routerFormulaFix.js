const express = require("express");
const router = express.Router();

const ControllerFormulaFix = require("../controllers/controllerFormulaFix");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/create-formulaFix",
  authentication,
  ControllerFormulaFix.createFormulaFix
);

module.exports = router;
