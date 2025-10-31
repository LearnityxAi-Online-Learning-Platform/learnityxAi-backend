const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const { deleteFile } = require("../services/cloudinary.service");

// upload single file
const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return sendErrorResponse(res, 400, "No file uploaded");
    }

    const fileData = {
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      format: req.file.format,
      resourceType: req.file.resource_type,
      size: req.file.size,
      width: req.file.width,
      height: req.file.height,
    };

    return sendSuccessResponse(res, 200, "File uploaded successfully", {
      file: fileData,
    });
  } catch (error) {
    console.error("Upload single file error:", error);
    return sendErrorResponse(res, 500, "Error uploading file");
  }
};


// upload multiple files
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendErrorResponse(res, 400, "No files uploaded");
    }

    const filesData = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
      format: file.format,
      resourceType: file.resource_type,
      size: file.size,
      width: file.width,
      height: file.height,
    }));

    return sendSuccessResponse(res, 200, "Files uploaded successfully", {
      files: filesData,
      count: filesData.length,
    });
  } catch (error) {
    console.error("Upload multiple files error:", error);
    return sendErrorResponse(res, 500, "Error uploading files");
  }
};

// upload multiple fields togeterh
const uploadMultipleFields = async (req, res) => {
  try {
    if (!req.files) {
      return sendErrorResponse(res, 400, "No files uploaded");
    }

    const filesData = {};

    Object.keys(req.files).forEach((fieldName) => {
      filesData[fieldName] = req.files[fieldName].map((file) => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        format: file.format,
        resourceType: file.resource_type,
        size: file.size,
        width: file.width,
        height: file.height,
      }));
    });

    return sendSuccessResponse(res, 200, "Files uploaded successfully", {
      files: filesData,
    });
  } catch (error) {
    console.error("Upload multiple fields error:", error);
    return sendErrorResponse(res, 500, "Error uploading files");
  }
};

// delte item friom the cloudanary
const deleteFileFromCloud = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return sendErrorResponse(res, 400, "Public ID is required");
    }

    const result = await deleteFile(publicId);

    if (result.result !== "ok") {
      return sendErrorResponse(res, 400, "Failed to delete file");
    }

    return sendSuccessResponse(res, 200, "File deleted successfully");
  } catch (error) {
    console.error("Delete file error:", error);
    return sendErrorResponse(res, 500, "Error deleting file");
  }
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadMultipleFields,
  deleteFileFromCloud,
};



