const express = require("express");
const {
  createCourse,
  getAllCourses,
  getInstructorCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseCategories,
  getToolsList,
  getDurationsList,
  searchCourses,
  enrollInCourse,
  getEnrolledCourses,
} = require("../controllers/course.controller");

const { authenticateUser } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
  createCourseValidation,
  updateCourseValidation,
} = require("../middleware/courseValidation.middleware");

const router = express.Router();

// Course related public rouets

// get all courses
router.get("/", getAllCourses);

// search courses
router.get("/search", searchCourses);

// get cours categories
router.get("/categories", getCourseCategories);

// get tool lists
router.get("/tools", getToolsList);

// get course duration lists
router.get("/durations", getDurationsList);

// get couse by ID
router.get("/:id", getCourseById);

// protected route list that can only acess to instructors

// Get courses for particular instructor
router.get(
  "/instructor/my-courses",
  authenticateUser,
  authorizeRoles("instructor"),
  getInstructorCourses
);

// create new cpurse
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

// Protected routes for students

// get enroles courses for studetns
router.get(
  "/student/enrolled",
  authenticateUser,
  authorizeRoles("student"),
  getEnrolledCourses
);

// student enrole to a course
router.post(
  "/:id/enroll",
  authenticateUser,
  authorizeRoles("student"),
  enrollInCourse
);

module.exports = router;
