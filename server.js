const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDatabase = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const uploadRoutes = require("./routes/upload.routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorHandler.middleware");

dotenv.config();

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

connectDatabase();

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Learning Platform API is running",
    version: "1.0.0",
  });
});

// base rotes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/upload", uploadRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`learnityxAi Server is running on port ${PORT}`);
});
