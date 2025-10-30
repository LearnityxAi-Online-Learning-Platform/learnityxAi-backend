const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User.model");
const OTP = require("../models/OTP.model");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const { generateOTP } = require("../utils/otpGenerator");
const { sendOTPEmail, sendWelcomeEmail } = require("../services/email.service");

// JWT token generation
const generateJWTToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// JWT refresh token generation
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

// Register User
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { firstName, lastName, email, password, role, phone } = req.body;

    // Handle existing email registations
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(res, 409, "Email already registered");
    }

    // Handle existing phone number
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return sendErrorResponse(res, 409, "Phone number already registered");
      }
    }

    // Handle invalid user roles
    if (role && !["student", "instructor"].includes(role)) {
      return sendErrorResponse(res, 400, "Invalid user role");
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || "student",
      phone,
    });

    const accessToken = generateJWTToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await user.addRefreshToken(refreshToken);

    const userResponse = user.getPublicProfile();

    sendWelcomeEmail(email, `${firstName} ${lastName}`, user.role);

    return sendSuccessResponse(
      res,
      201,
      `${user.role} Registration successful`,
      {
        user: userResponse,
        accessToken,
        refreshToken,
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. Fail to register"
    );
  }
};

// User login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendErrorResponse(res, 401, "Invalid email or password");
    }

    // compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Invalid email or password");
    }

    // handle deactivated users
    if (!user.isActive) {
      return sendErrorResponse(res, 403, "Your account has been deactivated.");
    }

    // update last login
    user.lastLogin = new Date();

    await user.save();

    const accessToken = generateJWTToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await user.addRefreshToken(refreshToken);

    const userResponse = user.getPublicProfile();

    return sendSuccessResponse(res, 200, "Login successful", {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendErrorResponse(res, 500, "Server error during login");
  }
};

// Handle refresh token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendErrorResponse(res, 400, "Refresh token is required");
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return sendErrorResponse(res, 401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return sendErrorResponse(res, 401, "User not found or inactive");
    }

    await user.cleanExpiredTokens();

    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === refreshToken && rt.expiresAt > new Date()
    );

    if (!tokenExists) {
      return sendErrorResponse(res, 401, "Invalid or expired refresh token");
    }

    const newAccessToken = generateJWTToken(user._id);

    return sendSuccessResponse(
      res,
      200,
      "Access token refreshed successfully",
      {
        accessToken: newAccessToken,
      }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return sendErrorResponse(res, 500, "Server error during token refresh");
  }
};

// handle logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const user = await User.findById(req.user._id);
      await user.removeRefreshToken(refreshToken);
    }

    return sendSuccessResponse(res, 200, "Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    return sendErrorResponse(res, 500, "Interval Server error fail to logout");
  }
};


// handle Forgot password
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendErrorResponse(
        res,
        404,
        "No account found with this email address"
      );
    }

    const otp = generateOTP();

    await OTP.deleteMany({ email, purpose: "password_reset" });

    await OTP.create({
      email,
      otp,
      purpose: "password_reset",
    });

    await sendOTPEmail(email, otp, `${user.firstName} ${user.lastName}`);

    return sendSuccessResponse(
      res,
      200,
      "OTP sent successfully. Please check your email."
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. Fail to sent OTP"
    );
  }
};

// OTP Verification
const verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: "password_reset",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return sendErrorResponse(res, 400, "Invalid or expired OTP");
    }

    return sendSuccessResponse(res, 200, "OTP verified successfully");
  } catch (error) {
    console.error("Verify OTP error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. OTP verification Failed"
    );
  }
};

// Handle Restpassword
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { email, otp, newPassword } = req.body;

    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: "password_reset",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return sendErrorResponse(res, 400, "Invalid or expired OTP");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    user.password = newPassword;
    await user.save();

    otpRecord.isUsed = true;
    await otpRecord.save();

    return sendSuccessResponse(res, 200, "Password reset successfully.");
  } catch (error) {
    console.error("Reset password error:", error);
    return sendErrorResponse(res, 500, "Server error during password reset");
  }
};

// Handle Get Profile Information
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const userResponse = user.getPublicProfile();
    return sendSuccessResponse(res, 200, "Profile retrieved successfully", {
      user: userResponse,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return sendErrorResponse(
      res,
      500,
      "Internal Server error. Failed to fetching profile"
    );
  }
};

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { firstName, lastName, phone, bio, profileImage } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    // Check if phone number is being changed and if it's already taken
    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return sendErrorResponse(res, 409, "Phone number already registered");
      }
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    const userResponse = user.getPublicProfile();

    return sendSuccessResponse(res, 200, "Profile updated successfully", {
      user: userResponse,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return sendErrorResponse(res, 500, "Server error while updating profile");
  }
};

const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Current password is incorrect");
    }

    // Check if new password is same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return sendErrorResponse(
        res,
        400,
        "New password cannot be the same as current password"
      );
    }

    user.password = newPassword;
    await user.save();

    return sendSuccessResponse(res, 200, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    return sendErrorResponse(res, 500, "Server error while changing password");
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
};
