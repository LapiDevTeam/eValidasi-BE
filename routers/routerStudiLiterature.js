const express = require("express");
const router = express.Router();
const ControllerStudiLiterature = require("../controllers/controllerStudiLiterature");

router.get(
  "/get-bahan-aktif/:id",
  ControllerStudiLiterature.getKarakteristikBahanAktif
);
router.get(
  "/get-bahan-kemasan/:id",
  ControllerStudiLiterature.getKarakteristikBahanKemasan
);
router.get(
  "/get-bahan-tambahan/:id",
  ControllerStudiLiterature.getKarakteristikBahanTambahan
);

module.exports = router;
