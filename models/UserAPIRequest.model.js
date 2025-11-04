const mongoose = require("mongoose");

// User API Request Tracking Model
const userAPIRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    requestType: {
      type: String,
      enum: ["chatgpt_recommendation"],
      default: "chatgpt_recommendation",
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    // Store hash of user state to detect changes
    userStateHash: {
      type: String,
      required: false,
    },
    // Cache the response for reuse
    cachedResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    cacheExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
userAPIRequestSchema.index({ userId: 1, requestDate: -1 });
userAPIRequestSchema.index({ userId: 1, requestType: 1, requestDate: -1 });
userAPIRequestSchema.index({ cacheExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to get daily request count for a user
userAPIRequestSchema.statics.getDailyRequestCount = async function (userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await this.countDocuments({
    userId,
    requestType: "chatgpt_recommendation",
    success: true,
    requestDate: { $gte: startOfDay },
  });

  return count;
};

// Method to check if user can make a request
userAPIRequestSchema.statics.canUserMakeRequest = async function (
  userId,
  maxDailyRequests = 2
) {
  const dailyCount = await this.getDailyRequestCount(userId);
  return dailyCount < maxDailyRequests;
};

// Method to get cached response if valid
userAPIRequestSchema.statics.getCachedResponse = async function (
  userId,
  userStateHash
) {
  const now = new Date();

  const cachedRequest = await this.findOne({
    userId,
    requestType: "chatgpt_recommendation",
    success: true,
    userStateHash,
    cacheExpiresAt: { $gt: now },
  }).sort({ requestDate: -1 });

  return cachedRequest ? cachedRequest.cachedResponse : null;
};

const UserAPIRequest = mongoose.model("UserAPIRequest", userAPIRequestSchema);

module.exports = UserAPIRequest;
