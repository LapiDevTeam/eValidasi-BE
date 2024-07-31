const express = require("express");
const router = express.Router();
const ControllerStudiPaten = require("../controllers/controllerStudiPaten");

router.get("/studi-paten/:id", ControllerStudiPaten.getStudiPaten);

router.delete("/delete-studi-paten/:id", ControllerStudiPaten.deleteStudiPaten);
module.exports = router;
