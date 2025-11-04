const express = require("express");
const {
  apiUsage,
} = require("../controllers/health.controller");

const router = express.Router();

// get api user 
router.get("/", apiUsage);

module.exports = router;