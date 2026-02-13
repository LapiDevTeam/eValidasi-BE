const express = require("express");
const router = express.Router();
const { authentication } = require("../../middlewares/authentication");
const { checkFileSizePublic } = require("../../middlewares/upload.middleware");
const {
  getPermohonanKalibrasiList,
  getPermohonanDetail,
  searchInstrumen,
  checkApproveButton,
  checkIsApproved,
  getFileDownload,
  downloadFileKalibrasi,
  savePermohonanKalibrasi,
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
  printTerkalibrasi
} = require("../../controllers/transactions/sertifikasi.controller");

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

router.get("/permohonan/check-approve", authentication, checkApproveButton);

router.get("/permohonan/is-approved", authentication, checkIsApproved);

router.get("/permohonan/file", authentication, getFileDownload);

router.get("/permohonan/download", authentication, downloadFileKalibrasi);

router.get("/approver/identity", authentication, getApproverIdentity);

router.post("/permohonan/save", authentication, savePermohonanKalibrasi);

router.post("/permohonan/approve", authentication, approvePermohonanKalibrasi);

router.post("/permohonan/upload", authentication, checkFileSizePublic, uploadFileKalibrasi);

router.delete("/permohonan/delete", authentication, deletePermohonanKalibrasi);

router.delete("/permohonan/file", authentication, deleteFileKalibrasi);

// ============== ASSESSMENT ROUTES ==============


router.get("/assesment/search", authentication, searchPermohonanAssesment);

router.get("/assesment/detail", authentication, getPermohonanAssesmentDetail);

router.get("/assesment/list", authentication, getAssesmentList);

router.get("/assesment/isapproved", authentication, checkIsApprovedAssesment);

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

// Search sertifikat with department filtering
router.get("/sertifikat/search", authentication, searchSertifikat);

// Get sertifikat detail by QA_ID and ID_No_Sertifikat
router.get("/sertifikat/detail", authentication, getSertifikatDetail);

// Get temperature (Suhu) grid data
router.get("/sertifikat/suhu", authentication, getSuhuData);

// Get humidity (Kelembaban) grid data
router.get("/sertifikat/kelembaban", authentication, getKelembabanData);

// Check if approved at specific level
router.get("/sertifikat/is-approved", authentication, checkIsApprovedSertifikat);

// Get approver identity
router.get("/sertifikat/approver-identity", authentication, getApproverIdentitySertifikat);

// Check if tanggal kalibrasi is input
router.get("/sertifikat/check-tgl-kalibrasi", authentication, checkTglKalibrasi);

// Check if user is allowed to input
router.get("/sertifikat/check-allow-input", authentication, checkAllowInputSertifikat);

// Search for re-sertifikasi
router.get("/sertifikat/search-resertifikasi", authentication, searchResertifikasi);

// Search DA Thermohygro for new certificate
router.get("/sertifikat/search-da", authentication, searchDAThermo);

// Check approve button state
router.get("/sertifikat/check-approve-button", authentication, checkApproveButtonSertifikat);

// ============== SERTIFIKAT POST OPERATIONS ==============

// Save/Update sertifikat header
router.post("/sertifikat/save", authentication, saveSertifikatHeader);

// Save/Update Suhu data
router.post("/sertifikat/suhu/save", authentication, saveSuhuData);

// Save/Update Kelembaban data
router.post("/sertifikat/kelembaban/save", authentication, saveKelembabanData);

// Delete Suhu data
router.delete("/sertifikat/suhu/delete", authentication, deleteSuhuData);

// Delete Kelembaban data
router.delete("/sertifikat/kelembaban/delete", authentication, deleteKelembabanData);

// Approve sertifikat
router.post("/sertifikat/approve", authentication, approveSertifikat);

// Reject sertifikat
router.post("/sertifikat/reject", authentication, rejectSertifikat);

// Generate DA from sertifikat
router.post("/sertifikat/generate-da", authentication, generateDASertifikat);

// Create new sertifikat from DA
router.post("/sertifikat/create-new", authentication, createNewSertifikat);

router.post("/sertifikat/resertifikasi", authentication, resertifikasi);

// Generate PDF data for sertifikat (Command2_Click from VBA)
router.post("/sertifikat/print-data", generateSertifikatPDF);

// Generate PDF data for sertifikat (Command2_Click from VBA)
router.get("/sertifikat/print", printHeaderThermo);

router.get("/sertifikat/print-terkalibrasi", printTerkalibrasi)

// Print Label Terkalibrasi (cmdLabelTerkalibrasi_Click from VBA)
router.post("/sertifikat/print-label", authentication, printLabelTerkalibrasi);

// ============== DA THERMOHYGRO ROUTES ==============

// Get DA Thermohygro list
router.get("/da-thermohygro/list", authentication, getDAThermohygroList);

// Get DA Thermohygro detail by QA_ID
router.get("/da-thermohygro/detail", authentication, getDAThermohygroDetail);

// Get DA Thermohygro data for export
router.get("/da-thermohygro/export", authentication, getDAThermohygroForExport);

// Check if DA is approved
router.get("/da-thermohygro/is-approved", authentication, checkIsApprovedDA);

// Check approve button status
router.get("/da-thermohygro/check-approve", authentication, checkApproveButtonDA);

// Get approver identity
router.get("/da-thermohygro/approver-identity", authentication, getApproverIdentityDA);

// Get file information
router.get("/da-thermohygro/file", authentication, getFileInfo);

// Get print data for DA report
router.get("/da-thermohygro/print-data", authentication, getPrintData);

// Get label data for Terkalibrasi label
router.get("/da-thermohygro/label-data", authentication, getLabelData);

// Get departments list
router.get("/da-thermohygro/departments", authentication, getDepartments);

// Check if user is allowed to input
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

module.exports = router;
