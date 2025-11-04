const mongoose = require("mongoose");

// Search History Model
const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    searchQuery: {
      type: String,
      required: [true, "Search query is required"],
      trim: true,
    },
    searchType: {
      type: String,
      enum: ["course_search", "category_filter", "skill_filter", "tool_filter"],
      default: "course_search",
    },
    filters: {
      category: String,
      skills: [String],
      tools: [String],
      minPrice: Number,
      maxPrice: Number,
      minRating: Number,
    },
    resultsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
searchHistorySchema.index({ userId: 1, createdAt: -1 });
searchHistorySchema.index({ searchQuery: "text" });

// Automatic deletion for old search history than 90 days
searchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema);

module.exports = SearchHistory;
