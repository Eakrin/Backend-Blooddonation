const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ ตั้งค่าให้ multer อัปโหลดไฟล์ขึ้น Cloudinary โดยตรง (ไม่เก็บไฟล์ไว้ในเครื่องเซิร์ฟเวอร์เลย)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "suttavej-blood-center/avatars", // เก็บรวมไว้ในโฟลเดอร์นี้บน Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // ย่อรูปใหญ่เกินไปให้อัตโนมัติ
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // จำกัดไฟล์ไม่เกิน 10MB
});

module.exports = { cloudinary, upload };