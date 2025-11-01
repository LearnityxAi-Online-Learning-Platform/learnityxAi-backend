const Course = require("../models/Course.model");
const SearchHistory = require("../models/SearchHistory.model");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const {
  generateCourseRecommendations,
  getAPIUsageStats,
} = require("../services/chatgpt.service");

// Get course recommendations for authenticated users using ChatGPT
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, size = 10 } = req.query;

    // Check API usage before proceeding
    const apiStats = getAPIUsageStats();
    console.log(
      `API Usage: ${apiStats.totalCalls}/${apiStats.maxCalls} (${apiStats.percentageUsed} used)`
    );

    // Fetch user's enrolled courses
    const enrolledCourses = await Course.find({
      enrolledStudents: userId,
      isActive: true,
    })
      .select("courseName courseCategory skills tools rating")
      .lean();

    // Fetch user's recent search history (last 30 searches)
    const searchHistory = await SearchHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("searchQuery filters")
      .lean();

    // Fetch all available courses that user hasn't enrolled in
    const availableCourses = await Course.find({
      isActive: true,
      enrolledStudents: { $ne: userId },
    })
      .select(
        "courseName courseCategory description skills tools price rating totalRatings instructorName startingDate duration courseFlyerURL"
      )
      .sort({ rating: -1, totalRatings: -1 })
      .lean();

    // If no courses available, return empty result
    if (availableCourses.length === 0) {
      return sendSuccessResponse(
        res,
        200,
        "No new courses available for recommendation",
        {
          courses: [],
          pagination: {
            currentPage: parseInt(page),
            pageSize: parseInt(size),
            totalCourses: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          recommendationType: "none",
          message: "You have enrolled in all available courses",
        }
      );
    }

    let sortedCourses = [];
    let recommendationType = "rating-based";
    let errorMessage = null;

    // Try to generate recommendations using ChatGPT
    try {
      const recommendedCourseIds = await generateCourseRecommendations(
        enrolledCourses,
        searchHistory,
        availableCourses
      );

      if (recommendedCourseIds && recommendedCourseIds.length > 0) {
        // Fetch recommended courses with full details
        const recommendedCourses = await Course.find({
          _id: { $in: recommendedCourseIds },
          isActive: true,
        })
          .select("-enrolledStudents")
          .lean();

        // Sort courses based on recommendation order from ChatGPT
        sortedCourses = recommendedCourseIds
          .map((id) =>
            recommendedCourses.find((course) => course._id.toString() === id)
          )
          .filter((course) => course !== undefined);

        recommendationType = "ai-powered";

        // If ChatGPT didn't return enough courses, add rating-based courses
        if (sortedCourses.length < 10) {
          const existingIds = sortedCourses.map((c) => c._id.toString());
          const additionalCourses = availableCourses
            .filter((c) => !existingIds.includes(c._id.toString()))
            .slice(0, 10 - sortedCourses.length);
          sortedCourses = [...sortedCourses, ...additionalCourses];
        }
      } else {
        // ChatGPT returned empty array, use rating-based
        sortedCourses = availableCourses;
      }
    } catch (error) {
      console.error("Error generating ChatGPT recommendations:", error);

      // Check if it's an API limit error
      if (error.message === "API_LIMIT_REACHED") {
        recommendationType = "rating-based";
        errorMessage =
          "AI recommendation limit reached. Showing courses based on ratings.";
        console.warn(
          "⚠️  ChatGPT API limit reached. Falling back to rating-based recommendations."
        );
      } else {
        // Other error, fallback to rating-based
        recommendationType = "rating-based";
        errorMessage =
          "AI recommendations temporarily unavailable. Showing courses based on ratings.";
        console.error(
          "ChatGPT error, falling back to rating-based recommendations:",
          error.message
        );
      }

      // Use all available courses sorted by rating
      sortedCourses = availableCourses;
    }

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedCourses = sortedCourses.slice(startIndex, endIndex);
    const totalCourses = sortedCourses.length;
    const totalPages = Math.ceil(totalCourses / pageSize);

    // Get updated API stats for response
    const updatedApiStats = getAPIUsageStats();

    const responseData = {
      courses: paginatedCourses,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSize,
        totalCourses,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      recommendationType,
      apiUsage: {
        used: updatedApiStats.totalCalls,
        remaining: updatedApiStats.remainingCalls,
        limit: updatedApiStats.maxCalls,
        percentageUsed: updatedApiStats.percentageUsed,
      },
    };

    // Add error message if present
    if (errorMessage) {
      responseData.message = errorMessage;
    }

    return sendSuccessResponse(
      res,
      200,
      recommendationType === "ai-powered"
        ? "AI-powered course recommendations retrieved successfully"
        : "Course recommendations retrieved successfully",
      responseData
    );
  } catch (error) {
    console.error("Get recommendations error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while generating recommendations"
    );
  }
};

// Get API usage statistics
const getAPIUsage = async (req, res) => {
  try {
    const stats = getAPIUsageStats();

    return sendSuccessResponse(res, 200, "API usage statistics retrieved", {
      usage: stats,
    });
  } catch (error) {
    console.error("Get API usage error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while retrieving API usage"
    );
  }
};

module.exports = {
  getRecommendations,
  getAPIUsage,
};
