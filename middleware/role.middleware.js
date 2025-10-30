const { sendErrorResponse } = require("../utils/responseHandler");

// handle roles

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Handle user not identifies
    if (!req.user) {
      return sendErrorResponse(
        res,
        401,
        "Authentication required. Please log in."
      );
    }

    // Handle invalid roles
    if (!allowedRoles.includes(req.user.role)) {
      return sendErrorResponse(
        res,
        403,
        `Access denied. This resource is only accessible to ${allowedRoles.join(
          " or "
        )}.`
      );
    }

    next();
  };
};

module.exports = {authorizeRoles};
