const express = require("express");
const {
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
} = require("../controllers/auth.controller");
const { authenticateUser } = require("../middleware/auth.middleware");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  verifyOTPValidation,
  resetPasswordValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require("../middleware/validation.middleware");

const router = express.Router();

router.post("/register", registerValidation, register);

router.post("/login", loginValidation, login);

router.post("/refresh-token", refreshAccessToken);

router.post("/logout", authenticateUser, logout);

router.post("/forgot-password", forgotPasswordValidation, forgotPassword);

router.post("/verify-otp", verifyOTPValidation, verifyOTP);

router.post("/reset-password", resetPasswordValidation, resetPassword);

router.get("/get-user-profile", authenticateUser, getProfile);

router.post(
  "/update-user-profile",
  authenticateUser,
  updateProfileValidation,
  updateProfile
);

router.post(
  "/change-password",
  authenticateUser,
  changePasswordValidation,
  changePassword
);

module.exports = router;
