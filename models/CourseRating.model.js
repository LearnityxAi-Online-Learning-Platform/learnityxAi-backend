const mongoose = require("mongoose");

// Course Rating Model
const courseRatingSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one user can only rate a course once
courseRatingSchema.index({ courseId: 1, userId: 1 }, { unique: true });

// Index for efficient queries
courseRatingSchema.index({ courseId: 1 });
courseRatingSchema.index({ userId: 1 });
courseRatingSchema.index({ rating: -1 });

const CourseRating = mongoose.model("CourseRating", courseRatingSchema);

module.exports = CourseRating;
