const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/healthController");

router.post("/", auth, controller.create);
router.get("/", auth, controller.getByDonor);

// ✅ ใหม่: สำหรับเจ้าหน้าที่
router.get("/pending", auth, controller.getPendingReview);
router.put("/:id/status", auth, controller.updateStatus);

module.exports = router;