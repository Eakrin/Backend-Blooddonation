const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");

router.get("/", locationController.getLocations);
router.post("/", locationController.createLocation);
router.put("/:id", locationController.updateLocation);
router.delete("/:id", locationController.deleteLocation);

module.exports = router;