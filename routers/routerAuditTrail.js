const express = require("express");
const router = express.Router();

const ControllerAuditTrail = require("../controllers/controllerAuditTrail");
const { authentication } = require("../middlewares/authentication");

router.get(
  "/download-product-brief",
  ControllerAuditTrail.downloadExcelAuditProductBriefHist
);
router.get(
  "/download-product-brief-status",
  ControllerAuditTrail.downloadExcelAuditProductBriefStatusHist
);
router.get(
  "/download-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditCatatanTrialHist
);
router.get(
  "/download-catatan-trial-status",
  ControllerAuditTrail.downloadExcelAuditCatatanTrialStatusHist
);
router.get(
  "/download-komposisi-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditKomposisiCatatanTrialHist
);
router.get(
  "/download-perhitungan-zat-aktif-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPerhitunganZatAktifHist
);
router.get(
  "/download-formula-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditFormulaCatatanTrialHist
);
router.get(
  "/download-metode-pembuatan-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditMetodePembuatanHist
);
router.get(
  "/download-pengamatan-awal-cair-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalCairHist
);
router.get(
  "/download-pengamatan-awal-padat-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalPadatHist
);
router.get(
  "/download-pengamatan-awal-steril-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalSterilHist
);
router.get(
  "/download-pengamatan-awal-penyalutan-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalPenyalutanHist
);
router.get(
  "/download-pengamatan-lanjutan-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalLanjutanHist
);
router.get(
  "/download-proses-catatan-trial-padat",
  ControllerAuditTrail.downloadExcelAuditProsesCatatanTrialPadatHist
);
router.get(
  "/download-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditStudiPraformulasiHist
);

module.exports = router;
