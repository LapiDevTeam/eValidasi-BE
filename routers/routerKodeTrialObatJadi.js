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
router.get(
  "/get-kode-trial-obat-jadi-template",
  authentication,
  ControllerKodeTrialObatJadi.getKodeTrialObatJadiTemplate
);
router.put(
  "/approve-kode-trial-obat-jadi",
  authentication,
  ControllerKodeTrialObatJadi.approveKodeTrialObatJadi
);
router.put(
  "/update-rencana-berlaku",
  authentication,
  ControllerKodeTrialObatJadi.updateRencanaBerlaku
);
router.put(
  "/update-rencana-berlaku",
  authentication,
  ControllerKodeTrialObatJadi.updateRencanaBerlaku
);
router.get(
  "/kode-trial-obat-jadi-latest",
  authentication,
  ControllerKodeTrialObatJadi.latestKodeTrialObatJadi
);
router.get(
  "/all-revisi-kode-trial-obat-jadi-template",
  authentication,
  ControllerKodeTrialObatJadi.allRevisiKodeTrialObatJadiTemplate
);
router.get(
  "/kode-trial-obat-jadi/:revisi",
  authentication,
  ControllerKodeTrialObatJadi.revisiKodeTrialObatJadi
);
router.put(
  "/edit-kode-trial-obat-jadi-template",
  authentication,
  ControllerKodeTrialObatJadi.editKodeTrialObatJadiTemplate
);
router.delete(
  "/delete-kode-trial-obat-jadi-template",
  authentication,
  ControllerKodeTrialObatJadi.deleteKodeTrialObatJadiTemplate
);
module.exports = router;
