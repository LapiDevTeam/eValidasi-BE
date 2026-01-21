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
  uploadFileKalibrasi
} = require("../../controllers/transactions/input-permohonan-kalibrasi.controller");

/**
 * GET /api/transactions/kalibrasi/permohonan/list
 * Get list of calibration requests (sb_Show_Grid)
 * Query params: tahun (year), bagian (department)
 */
router.get("/permohonan/list", authentication, getPermohonanKalibrasiList);

/**
 * GET /api/transactions/kalibrasi/permohonan/detail
 * Get single calibration request detail (grid_Head_DblClick)
 * Query params: no_permohonan (required)
 */
router.get("/permohonan/detail", authentication, getPermohonanDetail);

/**
 * GET /api/transactions/kalibrasi/instrumen/search
 * Search instruments across kalibrasi tables (cmdCari_Nama_Click)
 * Query params: search (QA_ID or instrument name)
 */
router.get("/instrumen/search", authentication, searchInstrumen);

/**
 * GET /api/transactions/kalibrasi/permohonan/check-approve
 * Check if user can approve and approval status (sb_approve_button)
 * Query params: no_permohonan, bagian (optional)
 */
router.get("/permohonan/check-approve", authentication, checkApproveButton);

/**
 * GET /api/transactions/kalibrasi/permohonan/is-approved
 * Check if permohonan is already approved (fn_IS_approve)
 * Query params: no_permohonan
 */
router.get("/permohonan/is-approved", authentication, checkIsApproved);

/**
 * GET /api/transactions/kalibrasi/permohonan/file
 * Get file name for download (sbFill_FileDownload)
 * Query params: no_permohonan
 */
router.get("/permohonan/file", authentication, getFileDownload);

/**
 * GET /api/transactions/kalibrasi/permohonan/download
 * Download file from FTP server (cmd_download_Click)
 * Query params: no_permohonan
 */
router.get("/permohonan/download", authentication, downloadFileKalibrasi);

/**
 * GET /api/transactions/kalibrasi/approver/identity
 * Get approver identity for current user (fnApprIdentity)
 * Query params: approver_no (optional, default 1)
 */
router.get("/approver/identity", authentication, getApproverIdentity);

/**
 * POST /api/transactions/kalibrasi/permohonan/save
 * Save (insert or update) calibration request (cmd_Save_Click)
 * Body: all permohonan fields
 */
router.post("/permohonan/save", authentication, savePermohonanKalibrasi);

/**
 * POST /api/transactions/kalibrasi/permohonan/approve
 * Approve calibration request (cmd_Approve_Click)
 * Body: { no_permohonan }
 */
router.post("/permohonan/approve", authentication, approvePermohonanKalibrasi);

/**
 * POST /api/transactions/kalibrasi/permohonan/upload
 * Upload file for calibration request (fnUploadFile)
 * Body: { no_permohonan } + file (multipart/form-data)
 */
router.post("/permohonan/upload", authentication, checkFileSizePublic, uploadFileKalibrasi);

/**
 * DELETE /api/transactions/kalibrasi/permohonan/delete
 * Delete calibration request (cmd_Del_Click)
 * Body: { no_permohonan }
 */
router.delete("/permohonan/delete", authentication, deletePermohonanKalibrasi);

module.exports = router;
