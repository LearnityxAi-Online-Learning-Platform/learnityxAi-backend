const { validationResult } = require("express-validator");
const CourseRating = require("../models/CourseRating.model");
const Course = require("../models/Course.model");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");

// Create or update course rating
const rateCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    if (!course.isActive) {
      return sendErrorResponse(res, 400, "This course is no longer available");
    }

    // Check if user is enrolled in the course
    if (!course.enrolledStudents.includes(userId)) {
      return sendErrorResponse(
        res,
        403,
        "You must be enrolled in this course to rate it"
      );
    }

    // Check if user already rated this course
    const existingRating = await CourseRating.findOne({
      courseId,
      userId,
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      if (comment !== undefined) existingRating.comment = comment;
      await existingRating.save();

      // Recalculate course average rating
      await updateCourseRating(courseId);

      return sendSuccessResponse(res, 200, "Rating updated successfully", {
        rating: existingRating,
      });
    } else {
      // Create new rating
      const newRating = await CourseRating.create({
        courseId,
        userId,
        rating,
        comment,
      });

      // Recalculate course average rating
      await updateCourseRating(courseId);

      return sendSuccessResponse(res, 201, "Rating created successfully", {
        rating: newRating,
      });
    }
  } catch (error) {
    console.error("Rate course error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return sendErrorResponse(
        res,
        400,
        "You have already rated this course. Please update your existing rating."
      );
    }

    return sendErrorResponse(res, 500, "Server error while rating course");
  }
};

// Get ratings for a course
const getCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, size = 10 } = req.query;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    const ratings = await CourseRating.find({ courseId })
      .populate("userId", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalRatings = await CourseRating.countDocuments({ courseId });
    const totalPages = Math.ceil(totalRatings / pageSize);

    return sendSuccessResponse(
      res,
      200,
      "Course ratings retrieved successfully",
      {
        ratings,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSize,
          totalRatings,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        averageRating: course.rating,
        totalRatingsCount: course.totalRatings,
      }
    );
  } catch (error) {
    console.error("Get course ratings error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while fetching course ratings"
    );
  }
};

// Get user's rating for a course
const getUserRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const rating = await CourseRating.findOne({ courseId, userId }).lean();

    if (!rating) {
      return sendErrorResponse(res, 404, "Rating not found");
    }

    return sendSuccessResponse(res, 200, "Rating retrieved successfully", {
      rating,
    });
  } catch (error) {
    console.error("Get user rating error:", error);
    return sendErrorResponse(res, 500, "Server error while fetching rating");
  }
};

// Delete user's rating for a course
const deleteRating = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const rating = await CourseRating.findOneAndDelete({ courseId, userId });

    if (!rating) {
      return sendErrorResponse(res, 404, "Rating not found");
    }

    // Recalculate course average rating
    await updateCourseRating(courseId);

    return sendSuccessResponse(res, 200, "Rating deleted successfully");
  } catch (error) {
    console.error("Delete rating error:", error);
    return sendErrorResponse(res, 500, "Server error while deleting rating");
  }
};

// Get all ratings given by a user
const getAllUserRatings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, size = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // Get all ratings by this user with course details
    const ratings = await CourseRating.find({ userId })
      .populate({
        path: "courseId",
        select:
          "courseName courseCategory instructorName description rating totalRatings courseFlyerURL startingDate duration price",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalRatings = await CourseRating.countDocuments({ userId });
    const totalPages = Math.ceil(totalRatings / pageSize);

    // Calculate user's average rating
    const allUserRatings = await CourseRating.find({ userId }).select("rating");
    const userAverageRating =
      allUserRatings.length > 0
        ? (
            allUserRatings.reduce((sum, r) => sum + r.rating, 0) /
            allUserRatings.length
          ).toFixed(1)
        : 0;

    return sendSuccessResponse(
      res,
      200,
      "User ratings retrieved successfully",
      {
        ratings,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSize,
          totalRatings,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        summary: {
          totalRatingsGiven: totalRatings,
          averageRatingGiven: parseFloat(userAverageRating),
        },
      }
    );
  } catch (error) {
    console.error("Get all user ratings error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while fetching user ratings"
    );
  }
};

// Get all system reviews and ratings (public endpoint)
const getAllSystemReviews = async (req, res) => {
  try {
    const { page = 1, size = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // Get all ratings with user and course details, sorted by newest first
    const reviews = await CourseRating.find()
      .populate({
        path: "userId",
        select: "firstName lastName profileImage",
      })
      .populate({
        path: "courseId",
        select: "courseName courseCategory instructorName courseFlyerURL",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalReviews = await CourseRating.countDocuments();
    const totalPages = Math.ceil(totalReviews / pageSize);

    // Calculate overall system statistics
    const allRatings = await CourseRating.find().select("rating");
    const averageSystemRating =
      allRatings.length > 0
        ? (
            allRatings.reduce((sum, r) => sum + r.rating, 0) /
            allRatings.length
          ).toFixed(1)
        : 0;

    return sendSuccessResponse(
      res,
      200,
      "System reviews retrieved successfully",
      {
        reviews,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSize,
          totalReviews,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        summary: {
          totalReviews: totalReviews,
          averageRating: parseFloat(averageSystemRating),
        },
      }
    );
  } catch (error) {
    console.error("Get all system reviews error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while fetching system reviews"
    );
  }
};

// Helper function to update course average rating
const updateCourseRating = async (courseId) => {
  try {
    const ratings = await CourseRating.find({ courseId });

    if (ratings.length === 0) {
      await Course.findByIdAndUpdate(courseId, {
        rating: 0,
        totalRatings: 0,
      });
      return;
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    await Course.findByIdAndUpdate(courseId, {
      rating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
    });
  } catch (error) {
    console.error("Update course rating error:", error);
  }
};

module.exports = {
  rateCourse,
  getCourseRatings,
  getUserRating,
  deleteRating,
  getAllUserRatings,
  getAllSystemReviews,
};
