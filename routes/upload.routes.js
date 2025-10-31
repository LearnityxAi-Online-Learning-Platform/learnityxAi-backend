const express = require("express");
const {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadMultipleFields,
  deleteFileFromCloud,
} = require("../controllers/upload.controller");
const { authenticateUser } = require("../middleware/auth.middleware");
const {
  uploadSingle,
  uploadMultiple,
  uploadFields,
} = require("../services/cloudinary.service");

const router = express.Router();

// upload flyer image
router.post(
  "/course-flyer",
  uploadSingle("courseFlyerImage"),
  uploadSingleFile
);


// upload profile images
router.post("/profile-image", uploadSingle("profileImage"), uploadSingleFile);

// upload multiple files
router.post(
  "/course-content",
  uploadMultiple("courseContent", 10),
  uploadMultipleFiles
);

// upload mltiple propertiezs
router.post(
  "/multiple-fields",
  uploadFields([
    { name: "courseFlyerImage", maxCount: 1 },
    { name: "courseContent", maxCount: 10 },
    { name: "profileImage", maxCount: 1 },
  ]),
  uploadMultipleFields
);

// delte image
router.delete("/delete", deleteFileFromCloud);

module.exports = router;