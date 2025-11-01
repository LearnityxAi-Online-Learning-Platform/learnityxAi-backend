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
const {
  checkUserRequestLimit,
  getUserUsageSummary,
} = require("../utils/perUserRateLimit");
const {
  checkCache,
  saveToCache,
} = require("../utils/recommendationCache");

// Get course recommendations for authenticated users using ChatGPT
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, size = 10 } = req.query;

    // Check global API usage before proceeding
    const apiStats = getAPIUsageStats();
    console.log(
      `[Global API Usage] ${apiStats.totalCalls}/${apiStats.maxCalls} (${apiStats.percentageUsed} used)`
    );

    // Check per-user request limit (2 calls per day)
    const userLimitCheck = await checkUserRequestLimit(userId);
    const userUsage = await getUserUsageSummary(userId);

    console.log(
      `[User API Usage] User ${userId} - ${userUsage.dailyRequestsUsed}/${userUsage.dailyRequestsLimit} requests used today`
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

    // Check cache first - if valid cached result exists, return it
    const cacheResult = await checkCache(userId, enrolledCourses, searchHistory);

    if (cacheResult.cached && cacheResult.data) {
      console.log(
        `[Cache Hit] User ${userId} - Returning cached recommendations (no API call made)`
      );

      // Return cached response with updated API usage stats
      const responseData = {
        ...cacheResult.data,
        cached: true,
        cacheSource: "24-hour cache",
        userUsage,
        apiUsage: {
          global: {
            used: apiStats.totalCalls,
            remaining: apiStats.remainingCalls,
            limit: apiStats.maxCalls,
            percentageUsed: apiStats.percentageUsed,
          },
          personal: {
            used: userUsage.dailyRequestsUsed,
            remaining: userUsage.remainingRequests,
            limit: userUsage.dailyRequestsLimit,
            hoursUntilReset: userUsage.hoursUntilReset,
          },
        },
      };

      return sendSuccessResponse(
        res,
        200,
        "Cached AI-powered course recommendations retrieved successfully",
        responseData
      );
    }

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
    let shouldCallChatGPT = false;

    // Check if user can make a ChatGPT request (per-user limit check)
    if (!userLimitCheck.canMakeRequest) {
      console.warn(
        `[Per-User Limit] User ${userId} - Daily limit reached (${userUsage.dailyRequestsUsed}/${userUsage.dailyRequestsLimit})`
      );
      errorMessage = userLimitCheck.reason;
      recommendationType = "rating-based";
      sortedCourses = availableCourses;
    } else {
      shouldCallChatGPT = true;
    }

    // Try to generate recommendations using ChatGPT if allowed
    if (shouldCallChatGPT) {
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

          // Cache the successful AI-powered recommendations
          await saveToCache(userId, cacheResult.stateHash, {
            courses: sortedCourses,
            recommendationType: "ai-powered",
          });
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
            "Global AI recommendation limit reached. Showing courses based on ratings.";
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
      cached: false,
      apiUsage: {
        global: {
          used: updatedApiStats.totalCalls,
          remaining: updatedApiStats.remainingCalls,
          limit: updatedApiStats.maxCalls,
          percentageUsed: updatedApiStats.percentageUsed,
        },
        personal: {
          used: userUsage.dailyRequestsUsed,
          remaining: userUsage.remainingRequests,
          limit: userUsage.dailyRequestsLimit,
          hoursUntilReset: userUsage.hoursUntilReset,
        },
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

// Get API usage statistics (global)
const getAPIUsage = async (req, res) => {
  try {
    const globalStats = getAPIUsageStats();
    const userId = req.user._id;
    const userStats = await getUserUsageSummary(userId);

    return sendSuccessResponse(res, 200, "API usage statistics retrieved", {
      global: globalStats,
      personal: userStats,
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

// Get all users' API usage (Admin only)
const getAllUsersAPIUsage = async (req, res) => {
  try {
    const UserAPIRequest = require("../models/UserAPIRequest.model");

    // Get today's start
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Aggregate usage by user
    const userUsageStats = await UserAPIRequest.aggregate([
      {
        $match: {
          requestType: "chatgpt_recommendation",
          success: true,
          requestDate: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalRequests: { $sum: 1 },
          lastRequestDate: { $max: "$requestDate" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          userId: "$_id",
          userName: "$userDetails.userName",
          email: "$userDetails.email",
          totalRequests: 1,
          lastRequestDate: 1,
          remainingRequests: {
            $subtract: [2, "$totalRequests"],
          },
        },
      },
      {
        $sort: { totalRequests: -1 },
      },
    ]);

    const globalStats = getAPIUsageStats();

    return sendSuccessResponse(res, 200, "All users API usage retrieved", {
      global: globalStats,
      users: userUsageStats,
      summary: {
        totalUsersToday: userUsageStats.length,
        totalRequestsToday: userUsageStats.reduce(
          (sum, u) => sum + u.totalRequests,
          0
        ),
      },
    });
  } catch (error) {
    console.error("Get all users API usage error:", error);
    return sendErrorResponse(
      res,
      500,
      "Server error while retrieving all users API usage"
    );
  }
};

module.exports = {
  getRecommendations,
  getAPIUsage,
  getAllUsersAPIUsage,
};
