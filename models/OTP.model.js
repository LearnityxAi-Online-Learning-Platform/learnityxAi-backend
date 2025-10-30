const mongoose = require("mongoose");

// Otp Model
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["password_reset", "email_verification"],
      default: "password_reset",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from created otp will valiud
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Autimatic deletion for expired otps 
otpSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});


const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;