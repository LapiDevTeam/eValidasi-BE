const express = require("express");
const router = express.Router();

const routerUpload = require("../routers/v2/routerUpload");
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

module.exports = router;
