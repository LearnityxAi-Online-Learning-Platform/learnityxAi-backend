const express = require("express");
const {
  rateCourse,
  getCourseRatings,
  getUserRating,
  deleteRating,
} = require("../controllers/rating.controller");
const { authenticateUser } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const { ratingValidation } = require("../middleware/validation.middleware");

const router = express.Router();

// Get all ratings for a specific course
router.get("/course/:courseId", getCourseRatings);

// Create or update a rating for a course
router.post(
  "/course/:courseId",
  authenticateUser,
  authorizeRoles("student"),
  ratingValidation,
  rateCourse
);

// Get user's own rating for a specific course
router.get(
  "/course/:courseId/my-rating",
  authenticateUser,
  authorizeRoles("student"),
  getUserRating
);

// Delete user's rating for a course
router.delete(
  "/course/:courseId",
  authenticateUser,
  authorizeRoles("student"),
  deleteRating
);

module.exports = router;
