const { getUsageSummary } = require ("../utils/apiUsageTracker");

const apiUsage = async (req, res) => {
  try {
    const apiUsage = getUsageSummary();
    res.status(200).json({
      success: true,
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
      database: "Connected",
      apiUsage: {
        chatGPT: {
          used: apiUsage.totalCalls,
          remaining: apiUsage.remainingCalls,
          limit: apiUsage.maxCalls,
          percentageUsed: apiUsage.percentageUsed,
        },
      },
    });
  } catch (error) {
    console.log("Error getting api usage: ", error);
  }
};

module.exports = { apiUsage };
