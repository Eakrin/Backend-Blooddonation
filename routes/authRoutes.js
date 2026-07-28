const express = require("express");
const router = express.Router();
const multer = require("multer"); // ✅ ใหม่: ใช้เช็คว่า error เป็น MulterError มั้ย
const authController = require("../controllers/authController");
const { upload } = require("../config/cloudinary");

router.post("/login", authController.login);

// ✅ ใหม่: ห่อ upload.single('profile') ด้วยฟังก์ชันของเราเอง เพื่อดัก error
// (เช่น ไฟล์ใหญ่เกินไป) แล้วตอบกลับเป็น JSON ที่มี message ชัดเจน
// แทนที่จะปล่อยให้ connection ขาดแบบเดิม (ทำให้ frontend เห็น error เป็น "undefined")
router.post("/register", (req, res, next) => {
  upload.single("profile")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 10MB)" });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // error อื่นๆ เช่น allowed_formats ไม่ตรง
      return res.status(400).json({ message: err.message || "อัปโหลดรูปไม่สำเร็จ" });
    }
    next();
  });
}, authController.register);

router.post("/google", authController.googleLogin);

module.exports = router;