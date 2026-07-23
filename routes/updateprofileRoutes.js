const express = require("express");
const router = express.Router();
const profileController = require("../controllers/updateprofileController");
const authMiddleware = require("../middleware/auth"); // เช็กชื่อไฟล์ middleware เช็ก token ของคุณอีกทีนะครับ

// PUT /api/update-profile/update-profile
router.put("/update-profile", authMiddleware, profileController.updateProfile);

// PUT /api/update-profile/change-password
router.put("/change-password", authMiddleware, profileController.changePassword);

module.exports = router;