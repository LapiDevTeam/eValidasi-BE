const express = require("express");
const router = express.Router();
const ControllerCatatanTrial = require("../controllers/controllerCatatanTrial");
// const { authentication } = require("../middlewares/authentication");

router.get("/all-namaProduk", ControllerCatatanTrial.findAllNamaProduct);
router.get("/all-catatan-trial", ControllerCatatanTrial.findAllCatatanTrial);
router.post("/create-catatanTrial", ControllerCatatanTrial.createCatatanTrial);
router.get("/all-namaBahanBaku", ControllerCatatanTrial.findNamaBahanBaku);
router.post(
  "/create-komposisi-catatanTrial",
  ControllerCatatanTrial.createKomposisiCatatanTrial
);
router.get(
  "/get-komposisiNamaBahan/:id",
  ControllerCatatanTrial.getKomposisiNamaBahan
);
router.delete(
  "/delete-catatan-trial/:id",
  ControllerCatatanTrial.deleteCatatanTrial
);

module.exports = router;
