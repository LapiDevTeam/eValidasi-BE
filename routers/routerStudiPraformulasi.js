const express = require("express");
const router = express.Router();
const ControllerStudiPraformulasi = require("../controllers/controllerStudiPraformulasi");

router.post(
  "/studi-praformulasi",
  ControllerStudiPraformulasi.createStudiPraformulasi
);

module.exports = router;
