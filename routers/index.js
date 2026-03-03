const express = require("express");
const router = express.Router();

const routerUpload = require("../routers/v2/routerUpload");
const routerPrintJob = require("../routers/v2/routerPrintJob");
const routerKalibrasi = require("../routers/transactions/routerKalibrasi");
const routerDaTimbangaMassa = require("../routers/transactions/Da-Timbangan-Massa.router");
const { authentication } = require("../middlewares/authentication");


router.get("/current-user", authentication, (req, res) => {
  try {
    // const { user_id, nama_user, bagian_user } = req.user;
    const result = {
      ...req.user,
    };
    console.log(result);
    res.status(200).json(result);
  } catch {
    console.log(error);
  }
});

router.get("/", (req, res) => {
  res.send("Welcome to LAPI Laboratories New API!");
});


router.use("/v2", routerUpload);
router.use("/v2", routerPrintJob);
router.use("/transactions/kalibrasi", routerKalibrasi);
router.use("/transactions/da-timbangan-massa", routerDaTimbangaMassa);

module.exports = router;
