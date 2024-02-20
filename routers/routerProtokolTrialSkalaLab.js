const express = require("express");
const router = express.Router();
const ControllerProtokolTrialSkalaLab = require("../controllers/controllerProtokolTrialSkalaLab");

router.post(
  "/protokol-trial-skala-lab",
  ControllerProtokolTrialSkalaLab.createProtokolTrialSkalaLab
);
router.post("/create-cqa", ControllerProtokolTrialSkalaLab.createCqa);
router.post(
  "/create-formula-protokol",
  ControllerProtokolTrialSkalaLab.createFormulaProtokol
);
router.post(
  "/create-proses-pembuatan",
  ControllerProtokolTrialSkalaLab.createFormulaProtokol
);
router.post("/create-cpp", ControllerProtokolTrialSkalaLab.createCpp);
router.post(
  "/rencana-aktivitas",
  ControllerProtokolTrialSkalaLab.createRencanaAktivitas
);
router.post(
  "/originator-atau-kompetitor",
  ControllerProtokolTrialSkalaLab.createOriginatorAtauKompetitor
);
router.post(
  "/kebutuhan-peralatan-dan-mesin",
  ControllerProtokolTrialSkalaLab.createKebutuhanPeralatanDanMesin
);

router.put(
  "/update-tujuan-protokol-trial-skala-lab/:ProtokolTrialSkalaLabID",
  ControllerProtokolTrialSkalaLab.updateTujuan
);

module.exports = router;
