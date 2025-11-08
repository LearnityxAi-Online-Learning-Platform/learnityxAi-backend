// API Usage Tracker for OpenAI ChatGPT API

const fs = require("fs");
const path = require("path");

const USAGE_FILE_PATH = path.join(__dirname, "../logs/api-usage.json");
const MAX_API_CALLS = 250;

// Initialize usage tracking
const initializeUsageTracking = () => {
  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create usage file if it doesn't exist
    if (!fs.existsSync(USAGE_FILE_PATH)) {
      const initialData = {
        totalCalls: 0,
        maxCalls: MAX_API_CALLS,
        calls: [],
        lastReset: new Date().toISOString(),
      };
      fs.writeFileSync(USAGE_FILE_PATH, JSON.stringify(initialData, null, 2));
    }
  } catch (error) {
    console.error("Error initializing usage tracking:", error);
  }
};

// Get current usage stats
const getUsageStats = () => {
  try {
    if (!fs.existsSync(USAGE_FILE_PATH)) {
      initializeUsageTracking();
    }

    const data = fs.readFileSync(USAGE_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading usage stats:", error);
    return {
      totalCalls: 0,
      maxCalls: MAX_API_CALLS,
      calls: [],
      lastReset: new Date().toISOString(),
    };
  }
};

// Check if API call is allowed
const canMakeAPICall = () => {
  const stats = getUsageStats();
  return stats.totalCalls < MAX_API_CALLS;
};

// Get remaining API calls
const getRemainingCalls = () => {
  const stats = getUsageStats();
  return MAX_API_CALLS - stats.totalCalls;
};

// Log API call
const logAPICall = (endpoint, success, error = null, prompt = null) => {
  try {
    const stats = getUsageStats();

    // Only increment totalCalls for successful API calls
    const newTotalCalls = success ? stats.totalCalls + 1 : stats.totalCalls;

    const callData = {
      timestamp: new Date().toISOString(),
      endpoint,
      success,
      error: error ? error.message : null,
      callNumber: success ? newTotalCalls : null, 
      prompt: prompt || null, // Log the prompt sent to ChatGPT
    };

    // Update totalCalls only if successful
    if (success) {
      stats.totalCalls = newTotalCalls;
    }

    stats.calls.push(callData);

    // Keep only last 100 calls in detail
    if (stats.calls.length > 100) {
      stats.calls = stats.calls.slice(-100);
    }

    fs.writeFileSync(USAGE_FILE_PATH, JSON.stringify(stats, null, 2));

    // Log to console
    console.log(
      `[API Call ${success ? `${stats.totalCalls}/${MAX_API_CALLS}` : 'FAILED - NOT COUNTED'}] ${endpoint} - ${
        success ? "SUCCESS" : "FAILED"
      }`
    );

    if (success && stats.totalCalls >= MAX_API_CALLS) {
      console.warn(
        "WARNING: API call limit reached! No more ChatGPT API calls allowed."
      );
    } else if (success && stats.totalCalls >= MAX_API_CALLS * 0.9) {
      console.warn(
        `WARNING: Approaching API call limit (${stats.totalCalls}/${MAX_API_CALLS})`
      );
    }

    return callData;
  } catch (error) {
    console.error("Error logging API call:", error);
    return null;
  }
};

// Reset usage stats (for testing or new period)
const resetUsageStats = () => {
  try {
    const resetData = {
      totalCalls: 0,
      maxCalls: MAX_API_CALLS,
      calls: [],
      lastReset: new Date().toISOString(),
    };
    fs.writeFileSync(USAGE_FILE_PATH, JSON.stringify(resetData, null, 2));
    console.log("API usage stats reset successfully");
    return true;
  } catch (error) {
    console.error("Error resetting usage stats:", error);
    return false;
  }
};

// Get usage summary
const getUsageSummary = () => {
  const stats = getUsageStats();
  const remaining = getRemainingCalls();
  const percentageUsed = ((stats.totalCalls / MAX_API_CALLS) * 100).toFixed(2);

  return {
    totalCalls: stats.totalCalls,
    maxCalls: MAX_API_CALLS,
    remainingCalls: remaining,
    percentageUsed: `${percentageUsed}%`,
    lastReset: stats.lastReset,
    canMakeCall: canMakeAPICall(),
  };
};

module.exports = {
  initializeUsageTracking,
  getUsageStats,
  canMakeAPICall,
  getRemainingCalls,
  logAPICall,
  resetUsageStats,
  getUsageSummary,
  MAX_API_CALLS,
};
