const express = require("express");
const router = express.Router();
const routerProductBrief = require("./routerProductBrief");
const routerStudiPraformulasi = require("./routerStudiPraformulasi");
const routerStudiPaten = require("./routerStudiPaten");
const routerStudiLiterature = require("./routerStudiLiterature");

router.get("/", (req, res) => {
  res.send("Welcome to LAPI Laboratories New API!");
});

router.use("/", routerProductBrief);
router.use("/", routerStudiPraformulasi);
router.use("/", routerStudiPaten);
router.use("/", routerStudiLiterature);
module.exports = router;
