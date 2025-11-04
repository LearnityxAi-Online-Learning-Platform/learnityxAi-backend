const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

// Optional authentication middleware - allows both authenticated and unauthenticated access
const optionalAuth = async (req, res, next) => {
  try {
    let accessToken;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      accessToken = req.headers.authorization.split(" ")[1];
    }

    // If no token, continue without authentication
    if (!accessToken) {
      req.user = null;
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.isActive) {
        req.user = null;
        return next();
      }

      req.user = user;
      next();
    } catch (error) {
      // If token is invalid or expired, continue without authentication
      req.user = null;
      next();
    }
  } catch (error) {
    console.error("Optional auth error:", error);
    req.user = null;
    next();
  }
};

module.exports = { optionalAuth };
