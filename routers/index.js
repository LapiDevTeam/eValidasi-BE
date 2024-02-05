const express = require("express");
const router = express.Router();
const routerProductBrief = require("./routerProductBrief");
const routerStudiPraformulasi = require("./routerStudiPraformulasi");
const routerStudiPaten = require("./routerStudiPaten");
const routerStudiLiterature = require("./routerStudiLiterature");
const routerProtokolTrialSkalaLab = require("./routerProtokolTrialSkalaLab");

router.get("/", (req, res) => {
  res.send("Welcome to LAPI Laboratories New API!");
});

router.use("/", routerProductBrief);
router.use("/", routerStudiPraformulasi);
router.use("/", routerStudiPaten);
router.use("/", routerStudiLiterature);
router.use("/", routerProtokolTrialSkalaLab);

module.exports = router;
