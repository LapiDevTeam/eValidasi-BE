const express = require("express");
const router = express.Router();
const ControllerStudiPraformulasi = require("../controllers/controllerStudiPraformulasi");
const { authentication } = require("../middlewares/authentication");
// save dan edit deskripsi Product
router.put(
  "/handle-deskripsi-product/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveDeskripsiProduct
);
// save dan edit farmakologiKlinis
router.put(
  "/handle-farmakologi-klinis/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveFarmakologiKlinis
);
// save dan edit formula
router.put(
  "/handle-formula-studi/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveFormula
);
// save dan edit stabilita
router.put(
  "/handle-stabilita/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveStabilita
);
// save dan edit studiPaten
router.put(
  "/handle-studi-paten/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveStudiPaten
);
// save dan edit ujiinkompatibilitas
router.put(
  "/handle-uji-inkompatibilitas/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveUjiInkompatibilitas
);
// save dan edit cqa
router.put(
  "/handle-cqa/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveCqa
);
// save dan edit formula protokol
router.put(
  "/handle-formula-protokol/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveFormulaProtokol
);
// save dan edit mapping
router.put(
  "/handle-mapping-process/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveMappingProcess
);
// save dan edit material
router.put(
  "/handle-material/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveMaterial
);
// save dan edit originator / kompetitor
router.put(
  "/handle-originator-kompetitor/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveOriginatorKompetitor
);
// save dan edit kebutuhan peralatan
router.put(
  "/handle-kebutuhan-peralatan/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKebutuhanPeralatan
);
// save dan edit karakteristik FisikaKimia
router.put(
  "/handle-karakteristik-fisikaKimia/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKarakteristikFisikaKimia
);
// save dan edit qtpp
router.put(
  "/handle-qtpp/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveQtpp
);
// save dan edit kemasan
router.put(
  "/handle-kemasan/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKemasan
);
// save dan edit karakteristik bahan aktif
router.put(
  "/handle-karakteristik-bahanAktif/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKarakteristikBahanAktif
);

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
  authentication,
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
  "/approve-pemohon/:id",
  authentication,
  ControllerStudiPraformulasi.approvePemohon
);

router.put(
  "/approve-studi/:id",
  authentication,
  ControllerStudiPraformulasi.approveStudi
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
