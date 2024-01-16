const express = require("express");
const router = express.Router();
const ControllerStudiPaten = require("../controllers/controllerStudiPaten");
router.post("/create-studiPaten", ControllerStudiPaten.createStudiPaten);
router.get("/studi-paten/:id", ControllerStudiPaten.getStudiPaten);
router.put("/edit-studi-paten/:id", ControllerStudiPaten.editStudiPaten);
router.delete("/delete-studi-paten/:id", ControllerStudiPaten.deleteStudiPaten);
module.exports = router;
