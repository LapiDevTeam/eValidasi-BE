const express = require("express");
const router = express.Router();
const routerProductBrief = require("./routerProductBrief");
const routerStudiPraformulasi = require("./routerStudiPraformulasi");
const routerStudiPaten = require("./routerStudiPaten");
const routerStudiLiterature = require("./routerStudiLiterature");
const routerProtokolTrialSkalaLab = require("./routerProtokolTrialSkalaLab");
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

router.use("/", routerProductBrief);
router.use("/", routerStudiPraformulasi);
router.use("/", routerStudiPaten);
router.use("/", routerStudiLiterature);
router.use("/", routerProtokolTrialSkalaLab);

module.exports = router;
