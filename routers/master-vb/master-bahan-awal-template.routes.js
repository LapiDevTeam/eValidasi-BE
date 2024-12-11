const express = require("express");
const { masterBahanAwalTemplate_CREATE, masterBahanAwalTemplate_UPDATE, masterBahanAwalTemplate_DELETE } = require("../../controllers/master-vb/master-bahan-awal-template.controller");
const router = express.Router();

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


module.exports = router;
