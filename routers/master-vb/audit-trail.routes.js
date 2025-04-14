const express = require('express');
const auditTrailRouter = express.Router();

const { authentication } = require('../../middlewares/authentication');
const { getAuditPrograms, getAuditTrailDetails, exportAuditTrail } = require('../../controllers/master-vb/audit-trail.controller');

auditTrailRouter.get('/test', (req, res) => {
  res.status(200).send('Audit Trail Route is working!');
});

auditTrailRouter.get('/programs', getAuditPrograms)
auditTrailRouter.get('/details', getAuditTrailDetails)
auditTrailRouter.get('/export', exportAuditTrail)



module.exports = auditTrailRouter;
