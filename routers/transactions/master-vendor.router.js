const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');

const {
  getVendorList,
  getVendorDetail,
  saveVendor,
  deleteVendor,
} = require('../../controllers/transactions/master-vendor.controller');

router.get('/list', authentication, getVendorList);
router.get('/detail', authentication, getVendorDetail);
router.post('/save', authentication, saveVendor);
router.delete('/delete', authentication, deleteVendor);

module.exports = router;
