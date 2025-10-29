const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// loading the environment variables
dotenv.config();

// create the express app
const app = express();

// Allowed cors origins
const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS
  ? process.env.ALLOWED_CORS_ORIGINS.split(",")
  : ["http://localhost:3000"];

// define cors options
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
};

// enable CORS
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
