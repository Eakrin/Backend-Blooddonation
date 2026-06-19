const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/healthController");

router.post("/", auth, controller.create);
router.get("/", auth, controller.getByDonor);

module.exports = router;