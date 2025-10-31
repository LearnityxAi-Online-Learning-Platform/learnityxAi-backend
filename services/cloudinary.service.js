const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// configuratiosn
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine folder based on file type
    let folder = "learnityxai";

    if (file.fieldname === "courseFlyerImage") {
      folder = "learnityxai/course-flyers";
    } else if (file.fieldname === "profileImage") {
      folder = "learnityxai/profile-images";
    } else if (file.fieldname === "courseContent") {
      folder = "learnityxai/course-content";
    }

    // Determine allowed formats based on file type
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isPDF = file.mimetype === "application/pdf";

    return {
      folder: folder,
      allowed_formats: isImage
        ? ["jpg", "jpeg", "png", "gif", "webp"]
        : isVideo
        ? ["mp4", "mov", "avi", "mkv"]
        : isPDF
        ? ["pdf"]
        : undefined,
      resource_type: isVideo ? "video" : "auto",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images, videos, and PDFs are allowed."
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Upload single file
const uploadSingle = (fieldName) => upload.single(fieldName);

// Upload multiple files
const uploadMultiple = (fieldName, maxCount = 10) =>
  upload.array(fieldName, maxCount);

// Upload multiple fields
const uploadFields = (fields) => upload.fields(fields);

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

// Delete multiple files from Cloudinary
const deleteMultipleFiles = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error("Error deleting files from Cloudinary:", error);
    throw error;
  }
};

// Get file details from Cloudinary
const getFileDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error("Error getting file details from Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  deleteFile,
  deleteMultipleFiles,
  getFileDetails,
};
