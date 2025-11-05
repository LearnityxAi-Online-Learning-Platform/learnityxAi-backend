const express = require("express");
const {
  getRecommendations,
  getAPIUsage,
  getAllUsersAPIUsage,
} = require("../controllers/recommendation.controller");
const { authenticateUser } = require("../middleware/auth.middleware");
const { optionalAuth } = require("../middleware/optionalAuth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
  throttleRecommendationRequests,
} = require("../middleware/recommendationRateLimit.middleware");

const router = express.Router();

// Get course recommendations (works with or without authentication)
// - Authenticated students: AI-powered personalized recommendations
// - Non-authenticated users: Rating-based recommendations
router.get(
  "/",
  optionalAuth,
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
