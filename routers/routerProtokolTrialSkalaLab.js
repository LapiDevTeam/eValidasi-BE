const express = require("express");
const router = express.Router();
const ControllerProtokolTrialSkalaLab = require("../controllers/controllerProtokolTrialSkalaLab");
const { authentication } = require("../middlewares/authentication");

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
  ControllerProtokolTrialSkalaLab.createProsesPembuatan
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
router.post("/material", ControllerProtokolTrialSkalaLab.createMaterial);
router.post("/zat-aktif", ControllerProtokolTrialSkalaLab.createZatAktif);
router.post(
  "/bahan-tambahan",
  ControllerProtokolTrialSkalaLab.createBahanTambahan
);
router.post(
  "/kemasan-primer",
  ControllerProtokolTrialSkalaLab.createKemasanPrimer
);
router.post(
  "/mapping-process",
  ControllerProtokolTrialSkalaLab.createMappingProcess
);
router.post(
  "/create-kemasan-skala-lab",
  ControllerProtokolTrialSkalaLab.createKemasanSkalaLab
);

router.get("/findSameDate", ControllerProtokolTrialSkalaLab.findSameDate);
router.get(
  "/all-protokol-skala-lab",
  ControllerProtokolTrialSkalaLab.findAllProtokolSkalaLab
);

// router.use(authentication);
//
router.get(
  "/protokol-skala-lab/:id",
  authentication,
  ControllerProtokolTrialSkalaLab.getProtokolSkalaLabDetails
);
router.get("/cqa/:id", ControllerProtokolTrialSkalaLab.getCqa);
router.get("/cpp/:id", ControllerProtokolTrialSkalaLab.getCpp);
router.get("/formula-protokol/:id", ControllerProtokolTrialSkalaLab.getFormula);
router.get(
  "/proses-pembuatan/:id",
  ControllerProtokolTrialSkalaLab.getProsesPembuatan
);
router.get(
  "/rencana-aktivitas/:id",
  ControllerProtokolTrialSkalaLab.getRencanaAktivitas
);
router.get(
  "/kebutuhan-peralatan/:id",
  ControllerProtokolTrialSkalaLab.getKebutuhanPeralatan
);
router.get("/material/:id", ControllerProtokolTrialSkalaLab.getMaterial);
router.get(
  "/originator-kompetitor/:id",
  ControllerProtokolTrialSkalaLab.getOriginatorKompetitor
);
router.get("/zat-aktif/:id", ControllerProtokolTrialSkalaLab.getZatAktif);
router.get(
  "/bahan-tambahan/:id",
  ControllerProtokolTrialSkalaLab.getBahanTambahan
);
router.get(
  "/kemasan-primer/:id",
  ControllerProtokolTrialSkalaLab.getKemasanPrimer
);
router.get(
  "/cqa-filter-yes/:id",
  ControllerProtokolTrialSkalaLab.getCqaFilterYes
);
router.get(
  "/mapping-process/:id",
  ControllerProtokolTrialSkalaLab.getMappingProcess
);
router.get(
  "/kemasan-protokol/:id",
  ControllerProtokolTrialSkalaLab.getKemasanProtokol
);

router.delete(
  "/delete-protokol-skala-lab/:id",
  ControllerProtokolTrialSkalaLab.deleteProtokolSkalaLab
);
router.put(
  "/update-tujuan-protokol-trial-skala-lab/:ProtokolTrialSkalaLabID",
  ControllerProtokolTrialSkalaLab.updateTujuan
);
router.put(
  "/edit-protokol-skala-lab/:id",
  ControllerProtokolTrialSkalaLab.editProtokolSkalaLab
);

router.put("/edit-material/:id", ControllerProtokolTrialSkalaLab.editMaterial);
router.put(
  "/edit-originator-kompetitor/:id",
  ControllerProtokolTrialSkalaLab.editOriginatorKompetitor
);
router.put(
  "/edit-rencana-aktivitas/:id",
  ControllerProtokolTrialSkalaLab.editRencanaAktivitas
);

router.put(
  "/edit-kebutuhan-peralatan/:id",
  ControllerProtokolTrialSkalaLab.editKebutuhanPeralatan
);
router.put("/edit-cqa/:id", ControllerProtokolTrialSkalaLab.editCqaDetails);
router.put("/edit-cpp/:id", ControllerProtokolTrialSkalaLab.editCppDetails);
router.put(
  "/edit-formula-protokol/:id",
  ControllerProtokolTrialSkalaLab.editFormulaDetails
);
router.put(
  "/edit-proses-pembuatan/:id",
  ControllerProtokolTrialSkalaLab.editProsesPembuatan
);
router.put("/edit-zat-aktif/:id", ControllerProtokolTrialSkalaLab.editZatAktif);
router.put(
  "/edit-bahan-tambahan/:id",
  ControllerProtokolTrialSkalaLab.editBahanTambahan
);
router.put(
  "/edit-kemasan-primer/:id",
  ControllerProtokolTrialSkalaLab.editKemasanPrimer
);
router.put(
  "/update-dokumenacuan-protokol/:ProtokolTrialSkalaLabID",
  ControllerProtokolTrialSkalaLab.updateDokumenAcuanProtokol
);
router.put(
  "/edit-mapping-process/:id",
  ControllerProtokolTrialSkalaLab.editMappingProcess
);
router.put(
  "/approve-protokol/:id",
  authentication,
  ControllerProtokolTrialSkalaLab.approveProtokol
);

module.exports = router;
