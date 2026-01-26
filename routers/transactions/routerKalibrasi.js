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
  approvePermohonanAssesment,
  rejectPermohonanAssesment
} = require("../../controllers/transactions/input-assesment-kalibrasi.controller");


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

router.get("/assesment/is-approved", authentication, checkIsApprovedAssesment);

router.get("/assesment/approver-identity", authentication, getApproverIdentityAssesment);

router.get("/assesment/check-allow-input", authentication, checkAllowInput);

router.post("/assesment/approve", authentication, approvePermohonanAssesment);

router.post("/assesment/reject", authentication, rejectPermohonanAssesment);

module.exports = router;
