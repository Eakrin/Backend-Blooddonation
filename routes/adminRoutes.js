const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/create-staff", adminController.createStaff);

module.exports = router;

router.get("/staff", adminController.getStaff);
router.put("/staff/:id", adminController.updateStaff);