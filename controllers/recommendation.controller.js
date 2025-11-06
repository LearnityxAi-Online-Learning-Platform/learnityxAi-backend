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

// Get course recommendations (works with or without authentication)
const getRecommendations = async (req, res) => {
  try {
    const { page = 1, size = 10 } = req.query;
    const isAuthenticated = req.user && req.user._id;
    const userId = isAuthenticated ? req.user._id : null;

    // For non-authenticated users, return rating-based recommendations only
    if (!isAuthenticated) {
      console.log("[Non-Authenticated Request] Returning rating-based recommendations");

      // Fetch all active courses sorted by rating
      const allCourses = await Course.find({ isActive: true })
        .select(
          "courseName courseCategory description whatYouWillLearn skills tools price rating totalRatings instructorName startingDate duration courseFlyerURL numberOfUserEnrolled"
        )
        .sort({ rating: -1, totalRatings: -1 })
        .lean();

      // Apply pagination
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(size)));
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const paginatedCourses = allCourses.slice(startIndex, endIndex);
      const totalCourses = allCourses.length;
      const totalPages = Math.ceil(totalCourses / pageSize);

      return sendSuccessResponse(
        res,
        200,
        "Rating-based course recommendations retrieved successfully",
        {
          courses: paginatedCourses,
          pagination: {
            currentPage: pageNum,
            pageSize: pageSize,
            totalCourses,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
          recommendationType: "rating-based",
          authenticated: false,
          message: "Login to get AI-powered personalized recommendations",
        }
      );
    }

    // Authenticated user flow
    console.log(`[Authenticated Request] User ${userId} - Checking AI recommendations`);

    // Check if user is rate limited (too many requests within 30 seconds)
    if (req.rateLimited) {
      console.warn(
        `[Rate Limited] User ${userId} - Returning rating-based recommendations due to rate limit`
      );

      // Fetch all active courses sorted by rating
      const allCourses = await Course.find({ isActive: true })
        .select(
          "courseName courseCategory description whatYouWillLearn skills tools price rating totalRatings instructorName startingDate duration courseFlyerURL numberOfUserEnrolled"
        )
        .sort({ rating: -1, totalRatings: -1 })
        .lean();

      // Apply pagination
      const pageNum = Math.max(1, parseInt(page));
      const pageSize = Math.min(50, Math.max(1, parseInt(size)));
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const paginatedCourses = allCourses.slice(startIndex, endIndex);
      const totalCourses = allCourses.length;
      const totalPages = Math.ceil(totalCourses / pageSize);

      return sendSuccessResponse(
        res,
        200,
        "Rating-based course recommendations (rate limited)",
        {
          courses: paginatedCourses,
          pagination: {
            currentPage: pageNum,
            pageSize: pageSize,
            totalCourses,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
          recommendationType: "rating-based",
          authenticated: true,
          rateLimited: true,
          rateLimitInfo: req.rateLimitInfo,
          message: req.rateLimitInfo.message,
        }
      );
    }

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

    // Fetch user's recent search history (last 15 searches)
    const searchHistory = await SearchHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .select("searchQuery filters")
      .lean();

    // Helper function to calculate relevance score based on search history
    const calculateRelevanceScore = (course, searchHistory) => {
      if (!searchHistory || searchHistory.length === 0) return 0;

      let score = 0;

      // Process recent searches (give more weight to recent searches)
      searchHistory.forEach((search, index) => {
        // Weight decreases with older searches (most recent = highest weight)
        const recencyWeight = searchHistory.length - index;
        let matchPoints = 0;

        // Check category match (highest priority - 10 points)
        if (search.filters && search.filters.category &&
            course.courseCategory === search.filters.category) {
          matchPoints += 10;
        }

        // Check skills match (3 points per matching skill)
        if (search.filters && search.filters.skills && search.filters.skills.length > 0 &&
            course.skills && course.skills.length > 0) {
          const matchingSkills = course.skills.filter(skill =>
            search.filters.skills.some(searchSkill =>
              searchSkill.toLowerCase() === skill.toLowerCase()
            )
          );
          matchPoints += matchingSkills.length * 3;
        }

        // Check tools match (3 points per matching tool)
        if (search.filters && search.filters.tools && search.filters.tools.length > 0 &&
            course.tools && course.tools.length > 0) {
          const matchingTools = course.tools.filter(tool =>
            search.filters.tools.some(searchTool =>
              searchTool.toLowerCase() === tool.toLowerCase()
            )
          );
          matchPoints += matchingTools.length * 3;
        }

        // Check search query match in course name or description (5 points for name, 2 for description)
        if (search.searchQuery && search.searchQuery.trim() !== "") {
          const query = search.searchQuery.toLowerCase();
          if (course.courseName && course.courseName.toLowerCase().includes(query)) {
            matchPoints += 5;
          }
          if (course.description && course.description.toLowerCase().includes(query)) {
            matchPoints += 2;
          }
        }

        // Check price range match (2 points for exact match, 1 for partial)
        if (search.filters) {
          const coursePrice = course.price || 0;
          if (search.filters.minPrice !== undefined && search.filters.maxPrice !== undefined) {
            if (coursePrice >= search.filters.minPrice && coursePrice <= search.filters.maxPrice) {
              matchPoints += 2;
            }
          } else if (search.filters.minPrice !== undefined) {
            if (coursePrice >= search.filters.minPrice) {
              matchPoints += 1;
            }
          } else if (search.filters.maxPrice !== undefined) {
            if (coursePrice <= search.filters.maxPrice) {
              matchPoints += 1;
            }
          }
        }

        // Check rating match (1 point)
        if (search.filters && search.filters.minRating !== undefined) {
          if (course.rating >= search.filters.minRating) {
            matchPoints += 1;
          }
        }

        // Apply recency weight to match points
        score += matchPoints * (recencyWeight / searchHistory.length);
      });

      return score;
    };

    // Check cache first - if valid cached result exists, return it
    const cacheResult = await checkCache(userId, enrolledCourses, searchHistory);

    if (cacheResult.cached && cacheResult.data) {
      console.log(
        `[Cache Hit] User ${userId} - Returning cached recommendations (no API call made)`
      );

      // Return cached response with updated API usage stats
      const responseData = {
        ...cacheResult.data,
        authenticated: true,
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
        "courseName courseCategory description whatYouWillLearn skills tools price rating totalRatings instructorName startingDate duration courseFlyerURL numberOfUserEnrolled"
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

    // Apply search relevance scoring to sort courses
    // Calculate relevance score for each course
    const coursesWithScores = sortedCourses.map(course => ({
      ...course,
      relevanceScore: calculateRelevanceScore(course, searchHistory)
    }));

    // Sort by relevance score (descending), then by rating, then by totalRatings
    coursesWithScores.sort((a, b) => {
      // First sort by relevance score
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // If relevance scores are equal, sort by rating
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      // If ratings are equal, sort by totalRatings
      return b.totalRatings - a.totalRatings;
    });

    // Remove the temporary relevanceScore field
    sortedCourses = coursesWithScores.map(({ relevanceScore, ...course }) => course);

    console.log(
      `[Relevance Scoring] Sorted ${sortedCourses.length} courses by search relevance. Top 5 courses: ${sortedCourses.slice(0, 5).map(c => c.courseName).join(', ')}`
    );

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
      authenticated: true,
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
