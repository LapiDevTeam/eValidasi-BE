const express = require("express");
const router = express.Router();

const routerUpload = require("../routers/v2/routerUpload");
const routerPrintJob = require("../routers/v2/routerPrintJob");
const routerKalibrasi = require("../routers/transactions/routerKalibrasi");
const routerDaTimbangaMassa = require("../routers/transactions/Da-Timbangan-Massa.router");
const routerSertifikasiKalibrasiBAGIAN = require("../routers/transactions/sertifikasi-Kalibrasi-Bagian.router");
const routerSertifikasiKalibrasiBAGIAN_DA = require("../routers/transactions/sertifikasi-Kalibrasi-Bagian-DA.router");
const routerPenghapusanAlat = require("../routers/transactions/penghapusan-alat.router");
const routerAuditTrail = require("../routers/transactions/auditTrail.router");
const routerCalibrationRiskAssessment = require("../routers/transactions/calibration-risk-assessment.router");
const routerPressureCalibration = require("../routers/transactions/pressure-calibration.router");
const routerThermohygrometerCalibration = require("../routers/transactions/thermohygrometer-calibration.router");
const routerCalibrationWorkbook = require("../routers/transactions/calibration-workbook.router");
const routerTimerCalibration = require("../routers/transactions/timer-calibration.router");
const routerTimbanganCalibration = require("../routers/transactions/timbangan-calibration.router");
const { authentication } = require("../middlewares/authentication");
const masterRouter = require("../routers/transactions/master-router");

router.get("/current-user", authentication, (req, res) => {
  try {
    // const { user_id, nama_user, bagian_user } = req.user;
    const result = {
      ...req.user,
    };
    console.log(result);
    res.status(200).json(result);
  } catch {
    console.log(error);
  }
});

router.get("/", (req, res) => {
  res.send("Welcome to LAPI Laboratories New API!");
});


router.use("/v2", routerUpload);
router.use("/v2", routerPrintJob);
router.use("/transactions/kalibrasi", routerKalibrasi);
router.use("/transactions/da-timbangan-massa", routerDaTimbangaMassa);
router.use("/transactions/kalibrasi/sertifikat-bagian", routerSertifikasiKalibrasiBAGIAN);
router.use("/transactions/da-bagian", routerSertifikasiKalibrasiBAGIAN_DA);
router.use("/transactions/penghapusan-alat", routerPenghapusanAlat);
router.use("/audit-trail", routerAuditTrail);
router.use("/api/calibration-risk-assessments", routerCalibrationRiskAssessment);
router.use("/pressure-calibration", routerPressureCalibration);
router.use("/thermohygrometer-calibration", routerThermohygrometerCalibration);
router.use("/api", routerCalibrationWorkbook);
router.use("/api", routerTimerCalibration);
router.use("/api", routerTimbanganCalibration);
router.use("/master", masterRouter);

module.exports = router;
