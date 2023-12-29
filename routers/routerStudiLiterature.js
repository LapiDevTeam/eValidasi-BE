const express = require("express");
const router = express.Router();
const ControllerStudiLiterature = require("../controllers/controllerStudiLiterature");
router.post(
  "/create-karateristikBahanAktif",
  ControllerStudiLiterature.createKarakteristikBahanAktif
);
router.post(
  "/create-karateristikBahanKemasan",
  ControllerStudiLiterature.createKarakteristikBahanKemasan
);
router.post(
  "/create-karateristikBahanTambahan",
  ControllerStudiLiterature.createKarakteristikBahanTambahan
);
module.exports = router;
