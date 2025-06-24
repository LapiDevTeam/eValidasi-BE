const express = require("express");
const router = express.Router();
const modulRevisiController = require('../controllers/modul-revisi/modul-revisi.controller');
const ControllerGlobalApi = require("../controllers/controllerGlobalApi");
const { authentication } = require("../middlewares/authentication");

router.get("/get-dpba", ControllerGlobalApi.getDpba);
router.get("/get-produk-terdampak", ControllerGlobalApi.getProdukTerdampak);

router.get('/module-revisions', modulRevisiController.getModuleRevisionsDA);
router.post('/module-revisions', modulRevisiController.createModuleRevision);
router.post('/module-revisions/same-number', modulRevisiController.createModuleRevisionWithSameNumber);
router.get('/module-revisions/latest-number', modulRevisiController.getLatestModuleRevisionNumber);
router.post('/module-revisions/update-or-create', modulRevisiController.updateOrCreateModuleRevision);
router.post('/module-revisions/approve', async (req, res) => {
  const { modulename, user_id, delegated_to } = req.body;
  try {
    const result = await modulRevisiController.approveModuleRevisionByModuleName(modulename, user_id, delegated_to);
    if (result === 1) {
      return res.status(200).json({ message: 'Module revision approved.' });
    } else {
      return res.status(400).json({ message: 'Approval failed.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

router.get('/asp-link', authentication, modulRevisiController.getAspLink);

module.exports = router;
