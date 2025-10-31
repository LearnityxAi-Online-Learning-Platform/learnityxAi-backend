const { body } = require("express-validator");

// Validate creat course
const createCourseValidation = [
  body("courseName")
    .trim()
    .notEmpty()
    .withMessage("Course name is required")
    .isLength({ max: 200 })
    .withMessage("Course name cannot exceed 200 characters"),

  body("courseCategory")
    .trim()
    .notEmpty()
    .withMessage("Course category is required"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Course description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("skills")
    .isArray({ min: 1 })
    .withMessage("At least one skill is required")
    .custom((skills) => {
      if (
        !skills.every(
          (skill) => typeof skill === "string" && skill.trim().length > 0
        )
      ) {
        throw new Error("All skills must be non-empty strings");
      }
      return true;
    }),

  body("tools").optional().isArray().withMessage("Tools must be an array"),

  body("startingDate")
    .notEmpty()
    .withMessage("Starting date is required")
    .isISO8601()
    .withMessage("Starting date must be a valid date"),

  body("duration").trim().notEmpty().withMessage("Duration is required"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number")
    .custom((value) => {
      if (value < 0) {
        throw new Error("Price cannot be negative");
      }
      return true;
    }),

  body("courseFlyerURL")
    .trim()
    .notEmpty()
    .withMessage("Course flyer URL is required")
    .isURL()
    .withMessage("Course flyer must be a valid URL"),
];

// Validate updating a course
const updateCourseValidation = [
  body("courseName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Course name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Course name cannot exceed 200 characters"),

  body("courseCategory")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Course category cannot be empty"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Course description cannot be empty")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("skills")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one skill is required")
    .custom((skills) => {
      if (
        !skills.every(
          (skill) => typeof skill === "string" && skill.trim().length > 0
        )
      ) {
        throw new Error("All skills must be non-empty strings");
      }
      return true;
    }),

  body("tools").optional().isArray().withMessage("Tools must be an array"),

  body("startingDate")
    .optional()
    .isISO8601()
    .withMessage("Starting date must be a valid date"),

  body("duration")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Duration cannot be empty"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .custom((value) => {
      if (value < 0) {
        throw new Error("Price cannot be negative");
      }
      return true;
    }),

  body("courseFlyerURL")
    .optional()
    .trim()
    .isURL()
    .withMessage("Course flyer must be a valid URL"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
];

module.exports = {
  createCourseValidation,
  updateCourseValidation,
};
