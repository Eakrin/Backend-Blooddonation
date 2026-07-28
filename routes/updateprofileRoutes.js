const express = require("express");
const router = express.Router();
const multer = require("multer"); // ✅ ใหม่: ใช้เช็คว่า error เป็น MulterError มั้ย
const profileController = require("../controllers/updateprofileController");
const authMiddleware = require("../middleware/auth"); // เช็กชื่อไฟล์ middleware เช็ก token ของคุณอีกทีนะครับ
const { upload } = require("../config/cloudinary"); // ✅ ใหม่

// ✅ ใหม่: ห่อ upload.single('profile') ด้วยฟังก์ชันของเราเอง เพื่อดัก error (เช่น ไฟล์ใหญ่เกินไป)
// แล้วตอบกลับเป็น JSON ที่มี message ชัดเจน (แพทเทิร์นเดียวกับ authRoutes.js)
function handleAvatarUpload(req, res, next) {
  upload.single("profile")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 10MB)" });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message || "อัปโหลดรูปไม่สำเร็จ" });
    }
    next();
  });
}

// PUT /api/update-profile/update-profile
// ✅ ใหม่: เพิ่ม handleAvatarUpload เข้ามาก่อน controller เพื่อรองรับการแนบไฟล์รูปโปรไฟล์ใหม่
router.put(
  "/update-profile",
  authMiddleware,
  handleAvatarUpload,
  profileController.updateProfile,
);

// PUT /api/update-profile/change-password
router.put("/change-password", authMiddleware, profileController.changePassword);

module.exports = router;