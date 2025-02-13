const express = require("express");
const { masterBahanAwalTemplate_CREATE, masterBahanAwalTemplate_UPDATE, masterBahanAwalTemplate_DELETE, masterBahanAwalTemplate_APPROVE, getViewDPBATemplate, masterItemPrinciple_CREATE, masterItemPrinciple_UPDATE, masterItemPrinciple_DELETE, getItemDetailsController, getItemSupplier_template, getHistorySupplier_template, checkPeriodController, printTest } = require("../../controllers/master-vb/master-bahan-awal-template.controller");
const { authentication } = require("../../middlewares/authentication");
const router = express.Router();

router.post("/approve", authentication, masterBahanAwalTemplate_APPROVE);

router.get("/print-data", authentication, getViewDPBATemplate);

router.get("/print", authentication, printTest);

router.post("/", authentication, masterBahanAwalTemplate_CREATE);

router.patch("/", authentication, masterBahanAwalTemplate_UPDATE);

router.delete("/", authentication, masterBahanAwalTemplate_DELETE);

router.post('/principle',authentication, masterItemPrinciple_CREATE);
router.patch('/principle',authentication, masterItemPrinciple_UPDATE);
router.delete('/principle',authentication, masterItemPrinciple_DELETE);
router.get('/principle',authentication, getItemSupplier_template);

router.get('/principle/history-period',authentication, checkPeriodController);
router.get('/principle/history',authentication, getHistorySupplier_template);

module.exports = router;
