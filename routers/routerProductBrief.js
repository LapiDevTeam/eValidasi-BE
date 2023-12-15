const express = require("express");
const router = express.Router();
const ControllerProductBrief = require("../controllers/controllerProductBrief");

router.post("/product-brief", ControllerProductBrief.createProductBrief);
router.get("/all-sediaans", ControllerProductBrief.findAllSediaan);
router.get("/all-ruang-lingkup", ControllerProductBrief.findAllRuangLingkup);

module.exports = router;
