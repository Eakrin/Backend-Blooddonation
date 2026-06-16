const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const bookingController = require("../controllers/bookingController");

router.post("/", auth, bookingController.createBooking);
router.get("/", auth, bookingController.getBooking);
router.put("/cancel/:booking_id", auth, bookingController.cancelBooking);

module.exports = router;
