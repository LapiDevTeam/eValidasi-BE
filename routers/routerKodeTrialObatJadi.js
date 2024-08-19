const express = require("express");
const router = express.Router();
const ControllerKodeTrialObatJadi = require("../controllers/controllerKodeTrialObatJadi");
const { authentication } = require("../middlewares/authentication");
// save dan edit karakteristik FisikaKimia
router.post(
  "/create-kode-trial-obat-jadi-template",
  authentication,
  ControllerKodeTrialObatJadi.createKodeTrialObatJadiTemplate
);
router.get(
  "/get-kode-trial-obat-jadi",
  authentication,
  ControllerKodeTrialObatJadi.getKodeTrialObatJadi
);
module.exports = router;
