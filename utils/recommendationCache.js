// Recommendation Caching Utility
// Caches recommendation results to avoid redundant ChatGPT API calls

const {
  generateUserStateHash,
  getCachedRecommendations,
  logUserAPIRequest,
} = require("./perUserRateLimit");

/**
 * Check if cached recommendations exist and are valid
 */
const checkCache = async (userId, enrolledCourses, searchHistory) => {
  try {
    // Generate hash of current user state
    const currentStateHash = generateUserStateHash(
      enrolledCourses,
      searchHistory
    );

    // Check for cached response
    const cachedData = await getCachedRecommendations(
      userId,
      currentStateHash
    );

    if (cachedData) {
      console.log(
        `[Cache HIT] User ${userId} - Returning cached recommendations`
      );
      return {
        cached: true,
        data: cachedData,
        stateHash: currentStateHash,
      };
    }

    console.log(
      `[Cache MISS] User ${userId} - No valid cache found, will call ChatGPT`
    );
    return {
      cached: false,
      data: null,
      stateHash: currentStateHash,
    };
  } catch (error) {
    console.error("Error checking cache:", error);
    return {
      cached: false,
      data: null,
      stateHash: null,
    };
  }
};

/**
 * Save recommendations to cache
 */
const saveToCache = async (userId, userStateHash, recommendationData) => {
  try {
    await logUserAPIRequest(userId, userStateHash, recommendationData, true);
    console.log(`[Cache SAVE] User ${userId} - Recommendations cached for 24h`);
    return true;
  } catch (error) {
    console.error("Error saving to cache:", error);
    return false;
  }
};

/**
 * Invalidate cache for a user (when they enroll in a new course)
 */
const invalidateUserCache = async (userId) => {
  try {
    const UserAPIRequest = require("../models/UserAPIRequest.model");

    // Set cache expiration to now for all user's cached requests
    await UserAPIRequest.updateMany(
      {
        userId,
        requestType: "chatgpt_recommendation",
        cacheExpiresAt: { $gt: new Date() },
      },
      {
        $set: { cacheExpiresAt: new Date() },
      }
    );

    console.log(`[Cache INVALIDATE] User ${userId} - Cache cleared`);
    return true;
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return false;
  }
};

module.exports = {
  checkCache,
  saveToCache,
  invalidateUserCache,
};
