const express = require("express");
const {
  getRecommendations,
  getAPIUsage,
} = require("../controllers/recommendation.controller");
const { authenticateUser } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const router = express.Router();

// Get personalized course recommendations for authenticated students
router.get(
  "/",
  authenticateUser,
  authorizeRoles("student"),
  getRecommendations
);

// Get API usage statistics
router.get("/api-usage", authenticateUser, getAPIUsage);

module.exports = router;
