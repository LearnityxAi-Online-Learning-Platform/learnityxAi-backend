const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDatabase = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const uploadRoutes = require("./routes/upload.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const ratingRoutes = require("./routes/rating.routes");
const health = require("./routes/health.routes");

const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler.middleware");

// Initialize API usage tracking
const {
  initializeUsageTracking,
  getUsageSummary,
} = require("./utils/apiUsageTracker");

const app = express();

const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS
  ? process.env.ALLOWED_CORS_ORIGINS.split(",")
  : ["http://localhost:3000"];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize API tracking system
initializeUsageTracking();

// Connect to database
connectDatabase();

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Learning Platform API is running",
    version: "1.0.0",
  });
});


// Base routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/health", health);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`learnityxAi Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Log initial API usage stats to console alwys
  const apiUsage = getUsageSummary();
  console.log(
    `ChatGPT API Usage: ${apiUsage.totalCalls}/${apiUsage.maxCalls} calls used (${apiUsage.percentageUsed})`
  );
  console.log(`Remaining API calls: ${apiUsage.remainingCalls}`);
});
