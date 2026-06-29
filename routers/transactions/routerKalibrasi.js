const express = require("express");
const router = express.Router();
const { authentication } = require("../../middlewares/authentication");
const {
  getTidakDapatStatus,
  saveTidakDapat,
  approveTidakDapatSPV,
  approveTidakDapatMGR,
  konfirmasiLabelTidakDapat,
} = require('../../controllers/transactions/tidak-dapat-internal.controller');
const { checkFileSizePublic } = require("../../middlewares/upload.middleware");
const {
  getPermohonanKalibrasiList,
  getPermohonanDetail,
  searchInstrumen,
  countInstrumen,
  getDashboardSummary,
  checkApproveButton,
  checkIsApproved,
  getFileDownload,
  downloadFileKalibrasi,
  savePermohonanKalibrasi,
  savePermohonanKalibrasiWithRiskAssessment,
  deletePermohonanKalibrasi,
  approvePermohonanKalibrasi,
  getApproverIdentity,
  uploadFileKalibrasi,
  deleteFileKalibrasi
} = require("../../controllers/transactions/input-permohonan-kalibrasi.controller");

const {
  searchPermohonanAssesment,
  getPermohonanAssesmentDetail,
  getAssesmentList,
  checkIsApproved: checkIsApprovedAssesment,
  checkIsApprovedLevel1: checkIsApprovedLevel1Assesment,
  getApproverIdentity: getApproverIdentityAssesment,
  checkAllowInput,
  saveAssesmentKalibrasi,
  checkCanReject,
  checkCanApprove,
  approvePermohonanAssesment,
  rejectPermohonanAssesment,
  generatePrint,
  generateDA,
  generateSertifikat,
  downloadFileAssesment,
  printHeader
} = require("../../controllers/transactions/input-assesment-kalibrasi.controller");

const {
  searchSertifikat,
  getSertifikatDetail,
  getSuhuData,
  getKelembabanData,
  checkIsApproved: checkIsApprovedSertifikat,
  getApproverIdentity: getApproverIdentitySertifikat,
  checkTglKalibrasi,
  checkAllowInput: checkAllowInputSertifikat,
  searchResertifikasi,
  searchDAThermo,
  checkApproveButton: checkApproveButtonSertifikat,
  saveSertifikatHeader,
  saveSuhuData,
  saveKelembabanData,
  deleteSuhuData,
  deleteKelembabanData,
  approveSertifikat,
  rejectSertifikat,
  generateDASertifikat,
  createNewSertifikat,
  resertifikasi,
  generateSertifikatPDF,
  printLabelTerkalibrasi,
  printHeaderThermo,
  printTerkalibrasi,
  printDAThermo,
  printHapusAlat
} = require("../../controllers/transactions/sertifikasi.controller");

const {
  searchSertifikatTimbangan,
  getSertifikatByQAID,
  getSertifikatTimbangan,
  getPreAdjData,
  getDayaUlangData,
  getPenyimpanganData,
  getPusatPanData,
  searchResertifikasiTimbangan,
  searchDATimbangan,
  // check/helper GETs
  checkIsApprovedTimbangan,
  checkTglKalibrasiTimbangan,
  checkAllowInputTimbangan,
  getApproverIdentityTimbangan,
  checkApproveButtonTimbangan,
  getPrintDataTimbangan,
  // POST save
  saveSertifikatTimbanganHeader,
  savePreAdjData,
  saveDayaUlangData,
  saveMassaStdData,
  savePusatPanData,
  // DELETE
  deletePreAdjData,
  deleteDayaUlangData,
  deleteMassaStdData,
  deletePusatPanData,
  // approve / reject
  approveSertifikatTimbangan,
  rejectSertifikatTimbangan,
  // generate DA / create new / resertifikasi
  generateDASertifikatTimbangan,
  createNewSertifikatTimbangan,
  resertifikasiTimbangan,
  // print label
  printLabelTerkalibrasiTimbangan,
} = require("../../controllers/transactions/sertifikasi-Timbangan.controller");

const {
  getDAThermohygroList,
  getDAThermohygroDetail,
  getDAThermohygroForExport,
  checkIsApproved: checkIsApprovedDA,
  checkApproveButton: checkApproveButtonDA,
  getApproverIdentity: getApproverIdentityDA,
  getFileInfo,
  getPrintData,
  getLabelData,
  getDepartments,
  checkAllowInput: checkAllowInputDA,
  saveDAThermohygro,
  approveDAThermohygro,
  rejectDAThermohygro,
  uploadFileDAThermohygro,
  downloadFileDAThermohygro,
  deleteFileDAThermohygro
} = require("../../controllers/transactions/sertifikasi-DA.controller");

const {
  getDaAnakTimbanganList,
  getDaAnakTimbanganDetail,
  getDaAnakTimbanganForExport,
  getDepartments: getDepartmentsAnakTimbangan,
  checkIsApproved: checkIsApprovedAnakTimbangan,
  checkApproveButton: checkApproveButtonAnakTimbangan,
  getApprIdentity: getApprIdentityAnakTimbangan,
  getFileName,
  getNextCalibrationDate,
  checkAllowInput: checkAllowInputAnakTimbangan,
  getPrintData: getPrintDataAnakTimbangan,
  getLabelData: getLabelDataAnakTimbangan,
  saveDaAnakTimbangan,
  approveDaAnakTimbangan,
  rejectDaAnakTimbangan,
  uploadFileDaAnakTimbangan,
  downloadFileDaAnakTimbangan,
  deleteFileDaAnakTimbangan,
} = require("../../controllers/transactions/sertifikasi-DA-Anak-Timbangan.controller");


router.get("/permohonan/list", authentication, getPermohonanKalibrasiList);
router.get("/permohonan/detail", authentication, getPermohonanDetail);
router.get("/instrumen/search", authentication, searchInstrumen);
router.get("/instrumen/count", authentication, countInstrumen);
router.get("/dashboard/summary", authentication, getDashboardSummary);
router.get("/permohonan/check-approve", authentication, checkApproveButton);
router.get("/permohonan/is-approved", authentication, checkIsApproved);
router.get("/permohonan/file", authentication, getFileDownload);
router.get("/permohonan/download", authentication, downloadFileKalibrasi);
router.get("/approver/identity", authentication, getApproverIdentity);
router.post("/permohonan/save", authentication, savePermohonanKalibrasi);
router.post("/permohonan/save-with-risk-assessment", authentication, savePermohonanKalibrasiWithRiskAssessment);
router.post("/permohonan/approve", authentication, approvePermohonanKalibrasi);
router.post("/permohonan/upload", authentication, checkFileSizePublic, uploadFileKalibrasi);
router.delete("/permohonan/delete", authentication, deletePermohonanKalibrasi);
router.delete("/permohonan/file", authentication, deleteFileKalibrasi);

// ============== ASSESSMENT ROUTES ==============


router.get("/assesment/search", authentication, searchPermohonanAssesment);
router.get("/assesment/detail", authentication, getPermohonanAssesmentDetail);
router.get("/assesment/list", authentication, getAssesmentList);
router.get("/assesment/isapproved", authentication, checkIsApprovedAssesment);
router.get("/assesment/isapproved-l1", authentication, checkIsApprovedLevel1Assesment);
router.get("/assesment/approver-identity", authentication, getApproverIdentityAssesment);
router.get("/assesment/check-allow-input", authentication, checkAllowInput);
router.post("/assesment/save", authentication, saveAssesmentKalibrasi);
router.get("/assesment/check-can-reject", authentication, checkCanReject);
router.get("/assesment/check-can-approve", authentication, checkCanApprove);
router.post("/assesment/approve", authentication, approvePermohonanAssesment);
router.post("/assesment/reject", authentication, rejectPermohonanAssesment);
router.post("/assesment/generate-print", authentication, generatePrint);
router.post("/assesment/generate-da", authentication, generateDA);
router.post("/assesment/generate-sertifikat", authentication, generateSertifikat);
router.get("/assesment/download", authentication, downloadFileAssesment);
router.get("/assesment/print", printHeader);

// ============== SERTIFIKAT THERMOHYGRO ROUTES ==============

router.get("/sertifikat/search", authentication, searchSertifikat);
router.get("/sertifikat/detail", authentication, getSertifikatDetail);
router.get("/sertifikat/suhu", authentication, getSuhuData);
router.get("/sertifikat/kelembaban", authentication, getKelembabanData);
router.get("/sertifikat/is-approved", authentication, checkIsApprovedSertifikat);
router.get("/sertifikat/approver-identity", authentication, getApproverIdentitySertifikat);
router.get("/sertifikat/check-tgl-kalibrasi", authentication, checkTglKalibrasi);
router.get("/sertifikat/check-allow-input", authentication, checkAllowInputSertifikat);
router.get("/sertifikat/search-resertifikasi", authentication, searchResertifikasi);
router.get("/sertifikat/search-da", authentication, searchDAThermo);
router.get("/sertifikat/check-approve-button", authentication, checkApproveButtonSertifikat);

// ============== SERTIFIKAT POST OPERATIONS ==============

router.post("/sertifikat/save", authentication, saveSertifikatHeader);
router.post("/sertifikat/suhu/save", authentication, saveSuhuData);
router.post("/sertifikat/kelembaban/save", authentication, saveKelembabanData);
router.delete("/sertifikat/suhu/delete", authentication, deleteSuhuData);
router.delete("/sertifikat/kelembaban/delete", authentication, deleteKelembabanData);
router.post("/sertifikat/approve", authentication, approveSertifikat);
router.post("/sertifikat/reject", authentication, rejectSertifikat);
router.post("/sertifikat/generate-da", authentication, generateDASertifikat);
router.post("/sertifikat/create-new", authentication, createNewSertifikat);
router.post("/sertifikat/resertifikasi", authentication, resertifikasi);
router.post("/sertifikat/print-data", generateSertifikatPDF);
router.get("/sertifikat/print", printHeaderThermo);
router.get("/sertifikat/print-terkalibrasi", printTerkalibrasi)
router.post("/sertifikat/print-label", authentication, printLabelTerkalibrasi);
router.get("/sertifikat/print-da-thermo", printDAThermo);
router.get("/sertifikat/print-hapus-alat", printHapusAlat);

// ============== SERTIFIKAT TIMBANGAN ROUTES ==============


router.get("/sertifikat-timbangan/search", authentication, searchSertifikatTimbangan);
router.get("/sertifikat-timbangan/by-qa-id", authentication, getSertifikatByQAID);
router.get("/sertifikat-timbangan/detail", authentication, getSertifikatTimbangan);
router.get("/sertifikat-timbangan/pre-adj", authentication, getPreAdjData);
router.get("/sertifikat-timbangan/daya-ulang", authentication, getDayaUlangData);
router.get("/sertifikat-timbangan/penyimpangan", authentication, getPenyimpanganData);
router.get("/sertifikat-timbangan/pusat-pan", authentication, getPusatPanData);
router.get("/sertifikat-timbangan/search-resertifikasi", authentication, searchResertifikasiTimbangan);
router.get("/sertifikat-timbangan/search-da", authentication, searchDATimbangan);

// ============== SERTIFIKAT TIMBANGAN GET HELPERS ==============
router.get("/sertifikat-timbangan/is-approved", authentication, checkIsApprovedTimbangan);
router.get("/sertifikat-timbangan/check-tgl-kalibrasi", authentication, checkTglKalibrasiTimbangan);
router.get("/sertifikat-timbangan/check-allow-input", authentication, checkAllowInputTimbangan);
router.get("/sertifikat-timbangan/approver-identity", authentication, getApproverIdentityTimbangan);
router.get("/sertifikat-timbangan/check-approve-button", authentication, checkApproveButtonTimbangan);
router.get("/sertifikat-timbangan/print-data", authentication, getPrintDataTimbangan);

// ============== SERTIFIKAT TIMBANGAN POST OPERATIONS ==============
router.post("/sertifikat-timbangan/save", authentication, saveSertifikatTimbanganHeader);
router.post("/sertifikat-timbangan/pre-adj/save", authentication, savePreAdjData);
router.post("/sertifikat-timbangan/daya-ulang/save", authentication, saveDayaUlangData);
router.post("/sertifikat-timbangan/massa-std/save", authentication, saveMassaStdData);
router.post("/sertifikat-timbangan/pusat-pan/save", authentication, savePusatPanData);
router.delete("/sertifikat-timbangan/pre-adj/delete", authentication, deletePreAdjData);
router.delete("/sertifikat-timbangan/daya-ulang/delete", authentication, deleteDayaUlangData);
router.delete("/sertifikat-timbangan/massa-std/delete", authentication, deleteMassaStdData);
router.delete("/sertifikat-timbangan/pusat-pan/delete", authentication, deletePusatPanData);
router.post("/sertifikat-timbangan/approve", authentication, approveSertifikatTimbangan);
router.post("/sertifikat-timbangan/reject", authentication, rejectSertifikatTimbangan);
router.post("/sertifikat-timbangan/generate-da", authentication, generateDASertifikatTimbangan);
router.post("/sertifikat-timbangan/create-new", authentication, createNewSertifikatTimbangan);
router.post("/sertifikat-timbangan/resertifikasi", authentication, resertifikasiTimbangan);
router.post("/sertifikat-timbangan/print-label", authentication, printLabelTerkalibrasiTimbangan);

// ============== DA THERMOHYGRO ROUTES ==============

router.get("/da-thermohygro/list", authentication, getDAThermohygroList);
router.get("/da-thermohygro/detail", authentication, getDAThermohygroDetail);
router.get("/da-thermohygro/export", authentication, getDAThermohygroForExport);
router.get("/da-thermohygro/is-approved", authentication, checkIsApprovedDA);
router.get("/da-thermohygro/check-approve", authentication, checkApproveButtonDA);
router.get("/da-thermohygro/approver-identity", authentication, getApproverIdentityDA);
router.get("/da-thermohygro/file", authentication, getFileInfo);
router.get("/da-thermohygro/print-data", authentication, getPrintData);
router.get("/da-thermohygro/label-data", authentication, getLabelData);
router.get("/da-thermohygro/departments", authentication, getDepartments);
router.get("/da-thermohygro/allow-input", authentication, checkAllowInputDA);

// ============== DA THERMOHYGRO POST OPERATIONS ==============

router.post("/da-thermohygro/save", authentication, saveDAThermohygro);
router.post("/da-thermohygro/approve", authentication, approveDAThermohygro);
router.post("/da-thermohygro/reject", authentication, rejectDAThermohygro);
router.post("/da-thermohygro/upload", authentication, checkFileSizePublic, uploadFileDAThermohygro);
router.get("/da-thermohygro/download", authentication, downloadFileDAThermohygro);
router.post("/da-thermohygro/delete-file", authentication, deleteFileDAThermohygro);

// ============== DA ANAK TIMBANGAN ROUTES ==============

router.get("/da-anak-timbangan/list", authentication, getDaAnakTimbanganList);
router.get("/da-anak-timbangan/detail", authentication, getDaAnakTimbanganDetail);
router.get("/da-anak-timbangan/export", authentication, getDaAnakTimbanganForExport);
router.get("/da-anak-timbangan/departments", authentication, getDepartmentsAnakTimbangan);
router.get("/da-anak-timbangan/is-approved", authentication, checkIsApprovedAnakTimbangan);
router.get("/da-anak-timbangan/check-approve-button", authentication, checkApproveButtonAnakTimbangan);
router.get("/da-anak-timbangan/approver-identity", authentication, getApprIdentityAnakTimbangan);
router.get("/da-anak-timbangan/file-name", authentication, getFileName);
router.get("/da-anak-timbangan/next-calibration", authentication, getNextCalibrationDate);
router.get("/da-anak-timbangan/allow-input", authentication, checkAllowInputAnakTimbangan);
router.get("/da-anak-timbangan/print-data", authentication, getPrintDataAnakTimbangan);
router.get("/da-anak-timbangan/label-data", authentication, getLabelDataAnakTimbangan);

// POST routes for DA Anak Timbangan
router.post("/da-anak-timbangan/save", authentication, saveDaAnakTimbangan);
router.post("/da-anak-timbangan/approve", authentication, approveDaAnakTimbangan);
router.post("/da-anak-timbangan/reject", authentication, rejectDaAnakTimbangan);
router.post("/da-anak-timbangan/upload", authentication, checkFileSizePublic, uploadFileDaAnakTimbangan);
router.get("/da-anak-timbangan/download", authentication, downloadFileDaAnakTimbangan);
router.post("/da-anak-timbangan/delete-file", authentication, deleteFileDaAnakTimbangan);

// ============== TIDAK DAPAT DIKALIBRASI — THERMOHYGRO ==============
router.get("/sertifikat/tidak-dapat/status", authentication, getTidakDapatStatus);
router.post("/sertifikat/tidak-dapat/save", authentication, saveTidakDapat);
router.post("/sertifikat/tidak-dapat/approve-spv", authentication, approveTidakDapatSPV);
router.post("/sertifikat/tidak-dapat/approve-mgr", authentication, approveTidakDapatMGR);
router.post("/sertifikat/tidak-dapat/konfirmasi-label", authentication, konfirmasiLabelTidakDapat);

// ============== TIDAK DAPAT DIKALIBRASI — TIMBANGAN ==============
router.get("/sertifikat-timbangan/tidak-dapat/status", authentication, getTidakDapatStatus);
router.post("/sertifikat-timbangan/tidak-dapat/save", authentication, saveTidakDapat);
router.post("/sertifikat-timbangan/tidak-dapat/approve-spv", authentication, approveTidakDapatSPV);
router.post("/sertifikat-timbangan/tidak-dapat/approve-mgr", authentication, approveTidakDapatMGR);
router.post("/sertifikat-timbangan/tidak-dapat/konfirmasi-label", authentication, konfirmasiLabelTidakDapat);

module.exports = router;
