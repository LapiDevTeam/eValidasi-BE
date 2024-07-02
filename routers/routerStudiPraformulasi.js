const express = require("express");
const router = express.Router();
const ControllerStudiPraformulasi = require("../controllers/controllerStudiPraformulasi");

router.post(
  "/studi-praformulasi",
  ControllerStudiPraformulasi.createStudiPraformulasi
);

router.post("/create-cqa", ControllerStudiPraformulasi.createCqa);
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

// tambahan

router.post("/create-qtpp/:id", ControllerStudiPraformulasi.createQtpp);
router.get("/qtpp/:id", ControllerStudiPraformulasi.getQtpp);

router.get("/cqa/:id", ControllerStudiPraformulasi.getCqa);

router.post(
  "/create-formula-protokol",
  ControllerStudiPraformulasi.createFormulaProtokol
);
router.get(
  "/formula-protokol/:id",
  ControllerStudiPraformulasi.getFormulaProtokol
);
router.post(
  "/create-proses-pembuatan",
  ControllerStudiPraformulasi.createProsesPembuatan
);
router.get(
  "/proses-pembuatan/:id",
  ControllerStudiPraformulasi.getProsesPembuatan
);

router.post(
  "/create-kemasan-skala-lab",
  ControllerStudiPraformulasi.createKemasanSkalaLab
);
router.get(
  "/kemasan-protokol/:id",
  ControllerStudiPraformulasi.getKemasanProtokol
);
router.put(
  "/edit-kemasan-protokol/:id",
  ControllerStudiPraformulasi.editKemasanProtokol
);

router.post("/zat-aktif", ControllerStudiPraformulasi.createZatAktif);
router.post("/bahan-tambahan", ControllerStudiPraformulasi.createBahanTambahan);
router.post("/kemasan-primer", ControllerStudiPraformulasi.createKemasanPrimer);
router.get("/zat-aktif/:id", ControllerStudiPraformulasi.getZatAktif);
router.get("/bahan-tambahan/:id", ControllerStudiPraformulasi.getBahanTambahan);
router.get("/kemasan-primer/:id", ControllerStudiPraformulasi.getKemasanPrimer);
router.put("/edit-zat-aktif/:id", ControllerStudiPraformulasi.editZatAktif);

router.put(
  "/edit-bahan-tambahan-protokol/:id",
  ControllerStudiPraformulasi.editBahanTambahan
);
router.put(
  "/edit-kemasan-primer/:id",
  ControllerStudiPraformulasi.editKemasanPrimer
);

router.post(
  "/mapping-process",
  ControllerStudiPraformulasi.createMappingProcess
);
router.get(
  "/mapping-process/:id",
  ControllerStudiPraformulasi.getMappingProcess
);
router.put(
  "/edit-mapping-process/:id",
  ControllerStudiPraformulasi.editMappingProcess
);
router.post("/create-cpp", ControllerStudiPraformulasi.createCpp);
router.get("/cpp/:id", ControllerStudiPraformulasi.getCpp);
router.put("/edit-cpp/:id", ControllerStudiPraformulasi.editCppDetails);

router.post(
  "/rencana-aktivitas",
  ControllerStudiPraformulasi.createRencanaAktivitas
);
router.post(
  "/rencana-aktivitas",
  ControllerStudiPraformulasi.createRencanaAktivitas
);
router.get(
  "/rencana-aktivitas/:id",
  ControllerStudiPraformulasi.getRencanaAktivitas
);
router.put(
  "/edit-rencana-aktivitas/:id",
  ControllerStudiPraformulasi.editRencanaAktivitas
);
router.post("/material", ControllerStudiPraformulasi.createMaterial);
router.get("/material/:id", ControllerStudiPraformulasi.getMaterial);
router.put("/edit-material/:id", ControllerStudiPraformulasi.editMaterial);
router.post(
  "/originator-atau-kompetitor",
  ControllerStudiPraformulasi.createOriginatorAtauKompetitor
);
router.get(
  "/originator-kompetitor/:id",
  ControllerStudiPraformulasi.getOriginatorKompetitor
);
router.put(
  "/edit-originator-kompetitor/:id",
  ControllerStudiPraformulasi.editOriginatorKompetitor
);
router.post(
  "/kebutuhan-peralatan-dan-mesin",
  ControllerStudiPraformulasi.createKebutuhanPeralatanDanMesin
);
router.get(
  "/kebutuhan-peralatan/:id",
  ControllerStudiPraformulasi.getKebutuhanPeralatan
);
router.put(
  "/edit-kebutuhan-peralatan/:id",
  ControllerStudiPraformulasi.editKebutuhanPeralatan
);
module.exports = router;
