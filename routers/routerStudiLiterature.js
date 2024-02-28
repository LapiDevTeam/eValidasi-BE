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
router.put(
  "/edit-bahan-aktif/:id",
  ControllerStudiLiterature.editKarakteristikBahanAktif
);
router.put(
  "/edit-bahan-kemas/:id",
  ControllerStudiLiterature.editKarakteristikBahanKemasan
);
router.put(
  "/edit-bahan-tambahan/:id",
  ControllerStudiLiterature.editKarakteristikBahanTambahan
);
module.exports = router;
