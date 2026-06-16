const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const healthController = require("../controllers/healthController");

router.post("/", auth, healthController.createAssessment);

module.exports = router;
