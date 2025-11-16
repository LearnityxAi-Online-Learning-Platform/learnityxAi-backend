// Per-User Rate Limiting Utility for ChatGPT API
const crypto = require("crypto");
const UserAPIRequest = require("../models/UserAPIRequest.model");

// Configuration
const MAX_DAILY_REQUESTS_PER_USER = 10;
const CACHE_DURATION_HOURS = 24;


// Generate hash of user state to detect changes
const generateUserStateHash = (enrolledCourses, searchHistory) => {
  const enrolledIds = enrolledCourses.map((c) => c._id.toString()).sort();
  const searches = searchHistory.map((s) => s.searchQuery).slice(0, 10);

  const stateString = JSON.stringify({
    enrolled: enrolledIds,
    searches: searches,
  });

  return crypto.createHash("md5").update(stateString).digest("hex");
};

// Check if user can make a ChatGPT API request
const checkUserRequestLimit = async (userId) => {
  try {
    const dailyCount = await UserAPIRequest.getDailyRequestCount(userId);
    const remaining = MAX_DAILY_REQUESTS_PER_USER - dailyCount;

    if (dailyCount >= MAX_DAILY_REQUESTS_PER_USER) {
      return {
        canMakeRequest: false,
        remainingRequests: 0,
        reason: `Daily limit of ${MAX_DAILY_REQUESTS_PER_USER} AI recommendations reached. Limit resets at midnight.`,
      };
    }

    return {
      canMakeRequest: true,
      remainingRequests: remaining,
      reason: null,
    };
  } catch (error) {
    console.error("Error checking user request limit:", error);
    // On error, deny request for safety
    return {
      canMakeRequest: false,
      remainingRequests: 0,
      reason: "Unable to verify request limit",
    };
  }
};


// Get cached recommendations if available and valid
const getCachedRecommendations = async (userId, userStateHash) => {
  try {
    const cached = await UserAPIRequest.getCachedResponse(
      userId,
      userStateHash
    );
    return cached;
  } catch (error) {
    console.error("Error retrieving cached recommendations:", error);
    return null;
  }
};


// Log user API request and cache response

const logUserAPIRequest = async (
  userId,
  userStateHash,
  response = null,
  success = true,
  errorMessage = null
) => {
  try {
    const cacheExpiresAt = new Date();
    cacheExpiresAt.setHours(cacheExpiresAt.getHours() + CACHE_DURATION_HOURS);

    const requestRecord = await UserAPIRequest.create({
      userId,
      requestType: "chatgpt_recommendation",
      requestDate: new Date(),
      success,
      errorMessage,
      userStateHash,
      cachedResponse: success ? response : null,
      cacheExpiresAt: success ? cacheExpiresAt : null,
    });

    console.log(
      `[User API Request] User ${userId} - ${
        success ? "SUCCESS" : "FAILED"
      } - Cached until ${
        success ? cacheExpiresAt.toISOString() : "N/A"
      }`
    );

    return requestRecord;
  } catch (error) {
    console.error("Error logging user API request:", error);
    return null;
  }
};


// Get user's API usage summary
const getUserUsageSummary = async (userId) => {
  try {
    const dailyCount = await UserAPIRequest.getDailyRequestCount(userId);
    const remaining = MAX_DAILY_REQUESTS_PER_USER - dailyCount;

    // Get time until midnight reset time
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const hoursUntilReset = Math.ceil((midnight - now) / (1000 * 60 * 60));

    return {
      dailyRequestsUsed: dailyCount,
      dailyRequestsLimit: MAX_DAILY_REQUESTS_PER_USER,
      remainingRequests: Math.max(0, remaining),
      canMakeRequest: dailyCount < MAX_DAILY_REQUESTS_PER_USER,
      hoursUntilReset,
      cacheDurationHours: CACHE_DURATION_HOURS,
    };
  } catch (error) {
    console.error("Error getting user usage summary:", error);
    return {
      dailyRequestsUsed: 0,
      dailyRequestsLimit: MAX_DAILY_REQUESTS_PER_USER,
      remainingRequests: MAX_DAILY_REQUESTS_PER_USER,
      canMakeRequest: true,
      hoursUntilReset: 24,
      cacheDurationHours: CACHE_DURATION_HOURS,
    };
  }
};

module.exports = {
  MAX_DAILY_REQUESTS_PER_USER,
  CACHE_DURATION_HOURS,
  generateUserStateHash,
  checkUserRequestLimit,
  getCachedRecommendations,
  logUserAPIRequest,
  getUserUsageSummary,
};
