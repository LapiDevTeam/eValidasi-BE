const express = require("express");
const router = express.Router();
const ControllerStudiPraformulasi = require("../controllers/controllerStudiPraformulasi");

router.post(
  "/studi-praformulasi",
  ControllerStudiPraformulasi.createStudiPraformulasi
);
router.post(
  "/create-deskripsi-product",
  ControllerStudiPraformulasi.createDeskripsiProduct
);
router.delete(
  "/delete-deskripsi-product/:id",
  ControllerStudiPraformulasi.deleteDeskripsiProduct
);
router.delete(
  "/delete-stabilita/:id",
  ControllerStudiPraformulasi.deleteStabilita
);
router.delete(
  "/delete-farmakologi-klinis/:id",
  ControllerStudiPraformulasi.deleteFarmakologiKlinis
);
router.delete("/delete-kemasan/:id", ControllerStudiPraformulasi.deleteKemasan);
router.post(
  "/create-farmakologi-klinis",
  ControllerStudiPraformulasi.createFarmalogiKlinis
);
router.post("/create-stabilita", ControllerStudiPraformulasi.createStabilita);
router.post("/create-formula", ControllerStudiPraformulasi.createFormula);
router.post(
  "/create-ujiinkomptabilitas",
  ControllerStudiPraformulasi.createUjiInkomptabilitas
);
router.post(
  "/create-kontrol-bahan",
  ControllerStudiPraformulasi.createKontrolBahan
);
router.post("/create-kemasan/:id", ControllerStudiPraformulasi.createKemasan);
router.post(
  "/create-fisikakimia/:id",
  ControllerStudiPraformulasi.createFisikaKimia
);
router.put(
  "/create-kesimpulan/:StudiPraformulasiID",
  ControllerStudiPraformulasi.createKesimpulan
);
router.get("/get-product-brief", ControllerStudiPraformulasi.getProductBrief);
router.put(
  "/update-tujuan/:StudiPraformulasiID",
  ControllerStudiPraformulasi.updateTujuan
);
router.put(
  "/update-dokumenAcuan/:StudiPraformulasiID",
  ControllerStudiPraformulasi.updateDokumenAcuan
);
router.get(
  "/all-studi-praformulasi",
  ControllerStudiPraformulasi.findAllStudiPraformulasi
);

router.delete(
  "/delete-studi-praformulasi/:id",
  ControllerStudiPraformulasi.deleteStudiPraformulasi
);
router.get("/download", ControllerStudiPraformulasi.testDownload);
router.get(
  "/studi-praformulasi/:id",
  ControllerStudiPraformulasi.getStudiPraformulasiDetails
);
router.get(
  "/deskripsi-product/:id",
  ControllerStudiPraformulasi.getDeskripsiProductDetails
);
router.get(
  "/farmakologi-klinis/:id",
  ControllerStudiPraformulasi.getFarmakologiKlinisDetails
);
router.get("/formula/:id", ControllerStudiPraformulasi.getFormulaDetails);
router.get("/stabilita/:id", ControllerStudiPraformulasi.getStabilitaDetails);
router.get("/kemasan/:id", ControllerStudiPraformulasi.getKemasanDetails);
router.get(
  "/karakteristikFisikaKimia/:id",
  ControllerStudiPraformulasi.getKarakteristikFisikaKimia
);
router.get(
  "/uji-inkompatibilitas/:id",
  ControllerStudiPraformulasi.getUjiKompatibilitas
);
router.put(
  "/edit-studi-praformulasi/:id",
  ControllerStudiPraformulasi.editStudiPraformulasi
);
router.put(
  "/edit-deskripsi-product/:id",
  ControllerStudiPraformulasi.editDeskripsiProduct
);
router.put(
  "/edit-farmakologi-klinis/:id",
  ControllerStudiPraformulasi.editFarmakologiKlinis
);
router.put("/edit-stabilita/:id", ControllerStudiPraformulasi.editStabilita);
router.put("/edit-formula/:id", ControllerStudiPraformulasi.editFormulaDetails);
router.put("/edit-kemasan/:id", ControllerStudiPraformulasi.editKemasan);
router.put(
  "/edit-fisika-kimia/:id",
  ControllerStudiPraformulasi.editKarakteristikFisikaKimia
);
module.exports = router;
