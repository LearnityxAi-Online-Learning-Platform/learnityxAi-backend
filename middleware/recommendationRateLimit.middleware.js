// Rate Limiting Middleware for Recommendation Endpoint
// Prevents rapid consecutive requests (1 request per 30 seconds per user)

// Store for tracking last request time per user
const userLastRequestTime = new Map();

// Minimum time between requests in milliseconds (30 seconds)
const MIN_REQUEST_INTERVAL = 20 * 1000;

/**
 * Midleware to recommendation requests
 * Ensures users can only make 1 request per 20 seconds
 * When rate limited, sets req.rateLimited flag instead of returning error
 * This allows the controller to return rating-based recommendations
 */
const throttleRecommendationRequests = (req, res, next) => {
  try {
    // For non-authenticated users, skip rate limiting
    if (!req.user || !req.user._id) {
      req.rateLimited = false;
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();

    // Check if user has made a recent request
    if (userLastRequestTime.has(userId)) {
      const lastRequestTime = userLastRequestTime.get(userId);
      const timeSinceLastRequest = now - lastRequestTime;

      // If less than 30 seconds since last request, set rate limited flag
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTimeSeconds = Math.ceil(
          (MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000
        );

        console.warn(
          `[Rate Limit] User ${userId} exceeded rate limit. Returning rating-based recommendations. Must wait ${waitTimeSeconds}s for AI recommendations.`
        );

        // Set rate limited flag instead of returning error
        req.rateLimited = true;
        req.rateLimitInfo = {
          retryAfter: waitTimeSeconds,
          type: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. Showing rating-based recommendations. Wait ${waitTimeSeconds} seconds for AI-powered recommendations.`
        };

        return next();
      }
    }

    // Update last request time
    userLastRequestTime.set(userId, now);

    // Set rate limited flag to false
    req.rateLimited = false;

    // Clean up old entries (older than 5 minutes)
    const CLEANUP_THRESHOLD = 5 * 60 * 1000;
    for (const [key, value] of userLastRequestTime.entries()) {
      if (now - value > CLEANUP_THRESHOLD) {
        userLastRequestTime.delete(key);
      }
    }

    next();
  } catch (error) {
    console.error("Error in throttle middleware:", error);
    // On error, allow request to proceed 
    req.rateLimited = false;
    next();
  }
};

/**
 * Clear rate limit for a specific user
 */
const clearUserRateLimit = (userId) => {
  userLastRequestTime.delete(userId.toString());
};

/**
 * Get remaining wait time for a user
 */
const getRemainingWaitTime = (userId) => {
  const now = Date.now();
  if (!userLastRequestTime.has(userId.toString())) {
    return 0;
  }

  const lastRequestTime = userLastRequestTime.get(userId.toString());
  const timeSinceLastRequest = now - lastRequestTime;
  const remainingTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;

  return remainingTime > 0 ? Math.ceil(remainingTime / 1000) : 0;
};

module.exports = {
  throttleRecommendationRequests,
  clearUserRateLimit,
  getRemainingWaitTime,
  MIN_REQUEST_INTERVAL,
};
