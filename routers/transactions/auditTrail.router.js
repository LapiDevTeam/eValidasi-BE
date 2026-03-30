const express = require('express');
const router = express.Router();
const auditTrailController = require('../../controllers/transactions/auditTrail.controller');

router.get('/test', (req, res) => {
  res.status(200).send('Audit Trail Route is working!');
});

// GET /audit-trail/programs?system=eValidasi&program=eValidasi&type=ALL
router.get('/programs', auditTrailController.getAuditPrograms.bind(auditTrailController));

// GET /audit-trail/details?progId=&submenuId=&system=eValidasi
router.get('/details', auditTrailController.getAuditTrailDetails.bind(auditTrailController));

// GET /audit-trail/check-type?submenuId=&system=eValidasi
router.get('/check-type', auditTrailController.checkAuditType.bind(auditTrailController));

// GET /audit-trail/export?programId=&submenuId=&module=&filterColumn=&filterValue=&system=eValidasi
router.get('/export', auditTrailController.exportAuditTrail.bind(auditTrailController));

module.exports = router;
