const express = require("express");
const router = express.Router();
const ControllerStudiPraformulasi = require("../controllers/controllerStudiPraformulasi");
const { authentication } = require("../middlewares/authentication");

router.get(
  "/studi-praformulasi/history/:id",
  ControllerStudiPraformulasi.getHistoryStudiPraformulasi
);

router.get(
  "/studi-praformulasi-pending",
  ControllerStudiPraformulasi.getPendingStudiPraformulasi
);

router.post(
  "/auto-generate-approver-same-dept",
  ControllerStudiPraformulasi.autoBulkInsertSameDeptApproverLine
);

router.post(
  "/auto-generate-grup-user-custom",
  ControllerStudiPraformulasi.autoBulkInsertGrupUserAccesCustom
);

router.get(
  "/all-alasan-by-nomor/:nomor/:revisi",
  authentication,
  ControllerStudiPraformulasi.getAllAlasanByNomor
);
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
router.put(
  "/handle-cpp/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveCpp
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
// save dan edit karakteristik bahan tambahan
router.put(
  "/handle-karakteristik-bahanTambahan/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKarakteristikBahanTambahan
);
// save dan edit karakteristik bahan kemasan
router.put(
  "/handle-karakteristik-bahanKemasan/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKarakteristikBahanKemasan
);
// save dan edit kemasan protokol
router.put(
  "/handle-kemasan-protokol/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKemasanProtokol
);

// save dan edit zatAktif
router.put(
  "/handle-zatAktif/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveZatAktif
);
// save dan edit bahanTambahan
router.put(
  "/handle-bahanTambahan/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveBahanTambahan
);
// save dan edit kemasanPrimer
router.put(
  "/handle-kemasanPrimer/:id",
  authentication,
  ControllerStudiPraformulasi.handleSaveKemasanPrimer
);

// matrix perbandingan
router.post(
  "/create-matrix-perbandingan",
  authentication,
  ControllerStudiPraformulasi.createMatrixPerbandingan
);
router.put(
  "/update-matrix-perbandingan/:id",
  authentication,
  ControllerStudiPraformulasi.updateMatrixPerbandingan
);
router.put(
  "/update-tujuanScreening/:StudiPraformulasiID",
  authentication,
  ControllerStudiPraformulasi.updateTujuanScreening
);
router.put(
  "/update-kesimpulanScreening/:StudiPraformulasiID",
  authentication,
  ControllerStudiPraformulasi.updateKesimpulanScreening
);
router.put(
  "/update-kesimpulan/:StudiPraformulasiID",
  authentication,
  ControllerStudiPraformulasi.updateKesimpulan
);
router.get(
  "/matrix-perbandingan/:id",
  authentication,
  ControllerStudiPraformulasi.getMatrixPerbandingan
);
router.post(
  "/studi-praformulasi",
  authentication,
  ControllerStudiPraformulasi.createStudiPraformulasi
);

router.get("/get-product-brief", ControllerStudiPraformulasi.getProductBrief);
router.put(
  "/update-tujuan/:StudiPraformulasiID",
  authentication,
  ControllerStudiPraformulasi.updateTujuan
);
router.put(
  "/update-dokumenAcuan/:StudiPraformulasiID",
  authentication,
  ControllerStudiPraformulasi.updateDokumenAcuan
);
router.get(
  "/all-studi-praformulasi",
  ControllerStudiPraformulasi.findAllStudiPraformulasi
);
router.delete(
  "/delete-studi-praformulasi/:id",
  authentication,
  ControllerStudiPraformulasi.deleteStudiPraformulasi
);
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

// tambahan

router.get("/qtpp/:id", ControllerStudiPraformulasi.getQtpp);

router.get("/cqa/:id", ControllerStudiPraformulasi.getCqa);

router.get(
  "/formula-protokol/:id",
  ControllerStudiPraformulasi.getFormulaProtokol
);
router.post(
  "/create-proses-pembuatan",
  authentication,
  ControllerStudiPraformulasi.createProsesPembuatan
);
router.get(
  "/proses-pembuatan/:id",
  authentication,
  ControllerStudiPraformulasi.getProsesPembuatan
);
router.put(
  "/edit-proses-pembuatan/:id",
  authentication,
  ControllerStudiPraformulasi.editProsesPembuatan
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

router.get(
  "/mapping-process/:id",
  ControllerStudiPraformulasi.getMappingProcess
);

router.post(
  "/create-cpp",
  authentication,
  ControllerStudiPraformulasi.createCpp
);
router.get("/cpp/:id", ControllerStudiPraformulasi.getCpp);
router.put(
  "/edit-cpp/:id",
  authentication,
  ControllerStudiPraformulasi.editCppDetails
);

router.post(
  "/rencana-aktivitas",
  authentication,
  ControllerStudiPraformulasi.createRencanaAktivitas
);

router.get(
  "/rencana-aktivitas/:id",
  ControllerStudiPraformulasi.getRencanaAktivitas
);
router.put(
  "/edit-rencana-aktivitas/:id",
  authentication,
  ControllerStudiPraformulasi.editRencanaAktivitas
);

router.get("/material/:id", ControllerStudiPraformulasi.getMaterial);

router.get(
  "/originator-kompetitor/:id",
  ControllerStudiPraformulasi.getOriginatorKompetitor
);

router.get(
  "/kebutuhan-peralatan/:id",
  ControllerStudiPraformulasi.getKebutuhanPeralatan
);

module.exports = router;
