const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');

const {
  createLabelReprintRequest,
  listLabelReprintRequests,
  listReprintManualCandidates,
  getReprintEligibility,
  approveLabelReprintRequest,
  rejectLabelReprintRequest,
} = require('../../controllers/transactions/label-reprint-requests.controller');

// Registered before '/:requestId/*' so 'eligibility'/'candidates' aren't parsed as a requestId.
router.get('/eligibility', authentication, getReprintEligibility);
router.get('/candidates', authentication, listReprintManualCandidates);

// Create a re-print request. Any authenticated user (Admin through Manager) —
// no module-specific gate on creation, only approve/reject is Manager-gated.
router.post('/', authentication, createLabelReprintRequest);

router.get('/', authentication, listLabelReprintRequests);

router.post('/:requestId/approve', authentication, approveLabelReprintRequest);
router.post('/:requestId/reject', authentication, rejectLabelReprintRequest);

module.exports = router;
