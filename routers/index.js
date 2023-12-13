const express = require("express");
const router = express.Router();
const routerProductBrief = require("./routerProductBrief");

router.get("/", (req, res) => {
  res.send("Welcome to LAPI Laboratories New API!");
});

router.use("/", routerProductBrief);

module.exports = router;
