const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');

const {
  searchSertifikatBagian,
  searchByQAID,
  getSertifikatBagianDetail,
  getHasilKalData,
  searchDABagian,
  searchResertifikasiBagian,
  checkIsApproved,
  checkApproveButton,
  checkTglKalibrasi,
  checkAllowInput,
  getApproverIdentityBagian,
  getLabelData,
  getPrintData,
  // POST / mutation
  saveSertifikatBagianHeader,
  saveHasilKalData,
  deleteHasilKalData,
  deleteKelembabanData,
  approveSertifikatBagian,
  rejectSertifikatBagian,
  generateDASertifikatBagian,
  createNewSertifikatBagian,
  resertifikasiBagian,
  printLabelTerkalibrasi,
} = require('../../controllers/transactions/sertifikasi-Kalibrasi-Bagian.controller');

// ============================================================
// SERTIFIKAT BAGIAN GET ROUTES
// ============================================================

// Search sertifikat (cmd_Cari_Sertifikat_Click) — dept-aware query
router.get('/search', authentication, searchSertifikatBagian);

// Search by QA_ID or ID_No_Sertifikat (sb_OpenByNo_QA_ID)
router.get('/search-by-qa-id', authentication, searchByQAID);

// Get detail data (sb_Isi_Data)
router.get('/detail', authentication, getSertifikatBagianDetail);

// Get hasil kalibrasi grid rows (sb_Show_Grid_Suhu)
router.get('/hasil-kal', authentication, getHasilKalData);

// Search DA Bagian for creating a new sertifikat (cmd_New_Click search part)
router.get('/search-da', authentication, searchDABagian);

// Search sertifikat for re-sertifikasi (cmd_ReSertifikasi_Click search part)
router.get('/search-resertifikasi', authentication, searchResertifikasiBagian);

// Check if approved at given approver level (fn_IS_approve)
router.get('/is-approved', authentication, checkIsApproved);

// Check approve/reject button status (sb_approve_button)
router.get('/check-approve-button', authentication, checkApproveButton);

// Check if tgl kalibrasi has been input (fnIsInputTglKalibrasi)
router.get('/check-tgl-kalibrasi', authentication, checkTglKalibrasi);

// Check if user is allowed to input (fnIsAllowInput)
router.get('/check-allow-input', authentication, checkAllowInput);

// Get approver identity (fnApprIdentity)
router.get('/approver-identity', authentication, getApproverIdentityBagian);

// Get label terkalibrasi data (PrintLabelTerkalibrasi_Besar / Kecil)
router.get('/label-data', authentication, getLabelData);

// Get print/export data for sertifikat document (generate_Sert_Thermo)
router.get('/print-data', authentication, getPrintData);

// ============================================================
// SERTIFIKAT BAGIAN POST / MUTATION ROUTES
// ============================================================

// Save / update sertifikat header (cmd_Save_Click)
router.post('/save', authentication, saveSertifikatBagianHeader);

// Save (insert or update) hasil kalibrasi row (Command3_Click)
router.post('/hasil-kal/save', authentication, saveHasilKalData);

// Delete hasil kalibrasi row (Command4_Click)
router.delete('/hasil-kal/delete', authentication, deleteHasilKalData);

// Delete kelembaban row (Command5_Click)
router.delete('/kelembaban/delete', authentication, deleteKelembabanData);

// Approve sertifikat bagian level 1 (cmd_Approve_Click)
router.post('/approve', authentication, approveSertifikatBagian);

// Reject / un-approve sertifikat bagian (cmd_reject_Click)
router.post('/reject', authentication, rejectSertifikatBagian);

// Generate DA from sertifikat bagian (cmd_Generate_DA_Click)
router.post('/generate-da', authentication, generateDASertifikatBagian);

// Create new sertifikat from DA Bagian (cmd_New_Click)
router.post('/create-new', authentication, createNewSertifikatBagian);

// Re-sertifikasi — copy to new certificate number (cmd_ReSertifikasi_Click)
router.post('/resertifikasi', authentication, resertifikasiBagian);

// Print label terkalibrasi — record first print date (PrintLabelTerkalibrasi)
router.post('/print-label', authentication, printLabelTerkalibrasi);

module.exports = router;
