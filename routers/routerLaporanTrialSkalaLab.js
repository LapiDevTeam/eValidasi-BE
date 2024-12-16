const express = require("express");
const router = express.Router();
const ControllerLaporanTrialSkalaLab = require("../controllers/controllerLaporanTrialSkalaLab");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/laporan-trial-skala-lab",
  authentication,
  ControllerLaporanTrialSkalaLab.createLaporanTrialSkalaLab
);

router.put(
  "/update-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.updateLaporanTrialSkalaLab
);

router.post(
  "/aktivitas-dan-waktu-pencapaian",
  ControllerLaporanTrialSkalaLab.createAktivitasDanWaktuPencapaian
);

router.post(
  "/create-kesimpulan-formula/:id",
  ControllerLaporanTrialSkalaLab.createKesimpulanFormula
);
router.post(
  "/create-ringkasan-hasil-studi-cpp/:id",
  ControllerLaporanTrialSkalaLab.createRingkasanHasilStudiCpp
);
router.post(
  "/create-ringkasan-hasil-studi-cma/:id",
  ControllerLaporanTrialSkalaLab.createRingkasanHasilStudiCma
);
router.post(
  "/create-kesimpulan-proses-terpilih/:id",
  ControllerLaporanTrialSkalaLab.createKesimpulanProsesTerpilih
);
router.post(
  "/create-usulan-penelitian-produk",
  ControllerLaporanTrialSkalaLab.createUsulanPenelitianProduk
);
router.post(
  "/create-update-assessment",
  ControllerLaporanTrialSkalaLab.createUpdateAssessment
);
router.post(
  "/create-update-assessment-bahan-aktif",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentBahanAktif
);
router.post(
  "/create-update-assessment-bahan-tambahan",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentBahanTambahan
);
router.post(
  "/create-update-assessment-kemasan",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentKemasan
);

router.delete(
  "/delete-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.deleteLaporanTrialSkalaLab
);

router.get(
  "/all-laporan-trial-skala-lab",
  ControllerLaporanTrialSkalaLab.findAllLaporanTrialSkalaLab
);
router.get(
  "/laporan-trial-skala-lab/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.getLaporanTrialSkalaLabDetails
);

router.put(
  "/update-dokumenacuan-laporan/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateDokumenAcuanLaporan
);

router.put(
  "/edit-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.editLaporanTrialSkalaLab
);

router.put("/edit-usulan/:id", ControllerLaporanTrialSkalaLab.editUsulan);
router.put(
  "/approve-laporanTrialSkalaLab/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.approveLaporanTrialSkalaLab
);

router.post(
  "/create-permasalahan",
  authentication,
  ControllerLaporanTrialSkalaLab.createPermasalahan
);

// save dan edit kriteria penerimaan
router.put(
  "/handle-kriteria-penerimaan/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveKriteriaPenerimaan
);

// save dan edit kriteria penerimaan
router.put(
  "/handle-studi-cpp-terhadap-cqa/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveStudiCppTerhadapCqa
);
// save dan edit hasilpengamatan
router.put(
  "/handle-hasil-pengamatan/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveHasilPengamatan
);

router.put(
  "/update-upload-studi/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUpload
);
router.get(
  "/studi-cpp-terhadap-cqa/:id",
  ControllerLaporanTrialSkalaLab.getStudiCppTerhadapCqa
);
// save dan edit bahan aktif cma
router.put(
  "/handle-bahan-aktif-cma/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveBahanAktifCma
);
router.put(
  "/update-upload-bahan-aktif-cma/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadBahanAktifCma
);
// save dan edit bahan tambahan cma
router.put(
  "/handle-bahan-tambahan-cma/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveBahanTambahanCma
);
router.put(
  "/update-upload-bahan-tambahan-cma/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadBahanTambahanCma
);

router.put(
  "/update-upload-aktivitas/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadAktivitas
);

// save dan edit hasil dan pembahasan orientasi
router.put(
  "/handle-hasil-dan-pembahasan-orientasi/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveHasilDanPembahasanOrientasi
);

router.put(
  "/update-upload-hasil-dan-pembahasan-orientasi/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadHasilDanPembahasanOrientasi
);

module.exports = router;
