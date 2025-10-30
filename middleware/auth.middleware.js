const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { sendErrorResponse } = require("../utils/responseHandler");

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

const authenticateUser = async (req, res, next) => {
  try {
    let accessToken;
    let refreshToken;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      accessToken = req.headers.authorization.split(" ")[1];
    }

    if (req.headers["x-refresh-token"]) {
      refreshToken = req.headers["x-refresh-token"];
    }

    if (!accessToken) {
      return sendErrorResponse(
        res,
        401,
        "Access denied. No token provided. Please log in."
      );
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return sendErrorResponse(res, 401, "Invalid token. User not found.");
      }

      if (!user.isActive) {
        return sendErrorResponse(
          res,
          403,
          "Your account has been deactivated."
        );
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError" && refreshToken) {
        try {
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
          );

          const user = await User.findById(refreshDecoded.id).select(
            "-password"
          );

          if (!user || !user.isActive) {
            return sendErrorResponse(
              res,
              401,
              "User not found or inactive. Please log in again."
            );
          }

          await user.cleanExpiredTokens();

          const tokenExists = user.refreshTokens.some(
            (rt) => rt.token === refreshToken && rt.expiresAt > new Date()
          );

          if (!tokenExists) {
            return sendErrorResponse(
              res,
              401,
              "Invalid or expired refresh token. Please log in again."
            );
          }

          const newAccessToken = generateAccessToken(user._id);

          res.setHeader("X-New-Access-Token", newAccessToken);

          req.user = user;
          req.tokenRefreshed = true;
          next();
        } catch (refreshError) {
          return sendErrorResponse(
            res,
            401,
            "Session expired. Please log in again."
          );
        }
      } else if (error.name === "JsonWebTokenError") {
        return sendErrorResponse(
          res,
          401,
          "Invalid token. Please log in again."
        );
      } else if (error.name === "TokenExpiredError") {
        return sendErrorResponse(
          res,
          401,
          "Token expired. log in again."
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal server error"
    );
  }
};

module.exports = { authenticateUser };
