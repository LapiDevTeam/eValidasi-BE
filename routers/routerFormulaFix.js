const express = require("express");
const router = express.Router();

const ControllerFormulaFix = require("../controllers/controllerFormulaFix");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/create-formulaFix",
  authentication,
  ControllerFormulaFix.createFormulaFix
);

router.get("/all-formula-fix", ControllerFormulaFix.findAllFormulaFix);
router.get(
  "/formula-fix/:id",
  authentication,
  ControllerFormulaFix.getFormulaFixDetails
);
router.put("/update-formulaFix/:id", ControllerFormulaFix.updateFormulaFix);
router.put(
  "/approve-formulaFix/:id",
  authentication,
  ControllerFormulaFix.approveFormulaFix
);
router.delete("/delete-formula-fix/:id", ControllerFormulaFix.deleteFormulaFix);

module.exports = router;
