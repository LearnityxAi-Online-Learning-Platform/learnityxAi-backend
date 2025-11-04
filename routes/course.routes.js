const express = require("express");
const {
  createCourse,
  getAllCourses,
  getInstructorCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  deactivateCourse,
  reactivateCourse,
  getCourseCategories,
  getToolsList,
  getDurationsList,
  searchCourses,
  enrollInCourse,
  getEnrolledCourses,
  getInstructorDashboard,
} = require("../controllers/course.controller");

const { authenticateUser } = require("../middleware/auth.middleware");
const { optionalAuth } = require("../middleware/optionalAuth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
  createCourseValidation,
  updateCourseValidation,
} = require("../middleware/courseValidation.middleware");

const router = express.Router();

// Course related public routes

// get all courses (with optional authentication for search history)
router.get("/", optionalAuth, getAllCourses);

// search courses (with optional authentication for search history)
router.get("/search", optionalAuth, searchCourses);

// get course categories
router.get("/categories", getCourseCategories);

// get tool lists
router.get("/tools", getToolsList);

// get course duration lists
router.get("/durations", getDurationsList);

// get course by ID
router.get("/:id", getCourseById);

// Protected route list that can only access to instructors

// Get instructor dashboard statistics
router.get(
  "/instructor/dashboard",
  authenticateUser,
  authorizeRoles("instructor"),
  getInstructorDashboard
);

// Get courses for particular instructor
router.get(
  "/instructor/my-courses",
  authenticateUser,
  authorizeRoles("instructor"),
  getInstructorCourses
);

// create new course
router.post(
  "/",
  authenticateUser,
  authorizeRoles("instructor"),
  createCourseValidation,
  createCourse
);

// update course
router.put(
  "/:id",
  authenticateUser,
  authorizeRoles("instructor"),
  updateCourseValidation,
  updateCourse
);

// delete course
router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles("instructor"),
  deleteCourse
);

// deactivate course (mark as inactive)
router.patch(
  "/:id/deactivate",
  authenticateUser,
  authorizeRoles("instructor"),
  deactivateCourse
);

// reactivate course (mark as active)
router.patch(
  "/:id/reactivate",
  authenticateUser,
  authorizeRoles("instructor"),
  reactivateCourse
);

// Protected routes for students

// get enrolled courses for students
router.get(
  "/student/enrolled",
  authenticateUser,
  authorizeRoles("student"),
  getEnrolledCourses
);

// student enroll to a course
router.post(
  "/:id/enroll",
  authenticateUser,
  authorizeRoles("student"),
  enrollInCourse
);

module.exports = router;
