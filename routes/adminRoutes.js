const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/create-staff", adminController.createStaff);
router.post("/create-admin", adminController.createAdmin);

module.exports = router;

router.get("/staff", adminController.getStaff);
router.put("/staff/:id", adminController.updateStaff);

router.get("/admins", adminController.getAdmins);
router.put("/admins/:id/status", adminController.updateAdminStatus);