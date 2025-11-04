const express = require("express");
const {
  getRecommendations,
  getAPIUsage,
  getAllUsersAPIUsage,
} = require("../controllers/recommendation.controller");
const { authenticateUser } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
  throttleRecommendationRequests,
} = require("../middleware/recommendationRateLimit.middleware");

const router = express.Router();

// Get personalized course recommendations for authenticated students
// Protected by rate limiting (1 request per 30 seconds) and per-user limits (2 per day)
router.get(
  "/",
  authenticateUser,
  authorizeRoles("student"),
  throttleRecommendationRequests,
  getRecommendations
);

// Get API usage statistics (personal + global)
router.get("/api-usage", authenticateUser, getAPIUsage);

// Get all users' API usage (Admin only)
router.get(
  "/admin/api-usage",
  authenticateUser,
  authorizeRoles("admin"),
  getAllUsersAPIUsage
);

module.exports = router;
