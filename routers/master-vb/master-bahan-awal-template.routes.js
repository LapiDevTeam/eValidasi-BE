const express = require("express");
const { masterBahanAwalTemplate_CREATE, masterBahanAwalTemplate_UPDATE, masterBahanAwalTemplate_DELETE, masterBahanAwalTemplate_APPROVE, getViewDPBATemplate, masterItemPrinciple_CREATE, masterItemPrinciple_UPDATE, masterItemPrinciple_DELETE } = require("../../controllers/master-vb/master-bahan-awal-template.controller");
const router = express.Router();

router.post(
  "/approve",
  masterBahanAwalTemplate_APPROVE
);

router.get(
  "/print",
  getViewDPBATemplate
);

router.post(
  "/",
  masterBahanAwalTemplate_CREATE
);

router.patch(
  "/",
  masterBahanAwalTemplate_UPDATE
);

router.delete(
  "/",
  masterBahanAwalTemplate_DELETE
);

router.post('/principle', masterItemPrinciple_CREATE);
router.patch('/principle', masterItemPrinciple_UPDATE);
router.delete('/principle', masterItemPrinciple_DELETE);


module.exports = router;