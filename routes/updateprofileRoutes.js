const express = require("express");
const router = express.Router();
const profileController = require("../controllers/updateprofileController");
const authMiddleware = require("../middleware/auth"); // เช็กชื่อไฟล์ middleware เช็ก token ของคุณอีกทีนะครับ

// ตั้งเส้นทางสั้นๆ ว่า /update
router.put("/update-profile", authMiddleware, profileController.updateProfile);

module.exports = router;
