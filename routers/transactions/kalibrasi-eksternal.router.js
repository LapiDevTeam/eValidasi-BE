const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');
const { checkFileSizePublicV2, uploadPublicV2 } = require('../../controllers/v2/upload.controller');

const {
  getKalibrasiEksternalList,
  getKalibrasiEksternalDetail,
  saveKalibrasiEksternal,
  deleteKalibrasiEksternal,
  uploadSertifikatVendor,
  deleteSertifikatVendor,
  getCurrentApprove,
  checkApproveButton,
  getApproverIdentityEksternal,
  approveKalibrasiEksternal,
  downloadSertifikatVendor,
  saveTidakDapat,
  approveTidakDapat,
  konfirmasiLabel,
  PROGRAM_NAME,
} = require('../../controllers/transactions/kalibrasi-eksternal.controller');

// ============== GET ROUTES ==============

router.get('/list', authentication, getKalibrasiEksternalList);
router.get('/detail', authentication, getKalibrasiEksternalDetail);
router.get('/current-approve', authentication, getCurrentApprove);
router.get('/check-approve-button', authentication, checkApproveButton);
router.get('/approver-identity', authentication, getApproverIdentityEksternal);
router.get('/download-sertifikat', authentication, downloadSertifikatVendor);

// ============== POST / DELETE ROUTES ==============

router.post('/save', authentication, saveKalibrasiEksternal);
router.post('/approve', authentication, approveKalibrasiEksternal);
router.post('/save-tidak-dapat', authentication, saveTidakDapat);
router.post('/approve-tidak-dapat', authentication, approveTidakDapat);
router.post('/konfirmasi-label', authentication, konfirmasiLabel);
router.delete('/delete', authentication, deleteKalibrasiEksternal);
router.delete('/delete-sertifikat', authentication, deleteSertifikatVendor);

// Upload sertifikat: multer middleware → uploadPublicV2 → uploadSertifikatVendor
router.post(
  '/upload-sertifikat',
  authentication,
  (req, _res, next) => {
    req.query.programName = PROGRAM_NAME;
    next();
  },
  checkFileSizePublicV2,
  uploadPublicV2,
  uploadSertifikatVendor
);

module.exports = router;
