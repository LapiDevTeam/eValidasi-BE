const express = require("express");
const router = express.Router();
const ControllerProtokolTrialSkalaLab = require("../controllers/controllerProtokolTrialSkalaLab");

router.post(
  "/protokol-trial-skala-lab",
  ControllerProtokolTrialSkalaLab.createProtokolTrialSkalaLab
);

router.put(
  "/update-tujuan-protokol-trial-skala-lab/:ProtokolTrialSkalaLabID",
  ControllerProtokolTrialSkalaLab.updateTujuan
);

module.exports = router;
