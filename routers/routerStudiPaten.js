const express = require("express");
const router = express.Router();
const ControllerStudiPaten = require("../controllers/controllerStudiPaten");
router.post("/create-studiPaten", ControllerStudiPaten.createStudiPaten);
module.exports = router;
