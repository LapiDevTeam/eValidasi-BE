const express = require("express");
const router = express.Router();

const ControllerAuditTrail = require("../controllers/controllerAuditTrail");
const { authentication } = require("../middlewares/authentication");

router.get(
  "/download-product-brief",
  ControllerAuditTrail.downloadExcelAuditProductBrief
);

module.exports = router;
