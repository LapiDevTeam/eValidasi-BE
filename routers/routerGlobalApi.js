const express = require("express");
const router = express.Router();

const ControllerGlobalApi = require("../controllers/controllerGlobalApi");
const { authentication } = require("../middlewares/authentication");

router.get("/get-dpba", ControllerGlobalApi.getDpba);
router.get("/get-produk-terdampak", ControllerGlobalApi.getProdukTerdampak);

module.exports = router;
