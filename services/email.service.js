const nodemailer = require("nodemailer");
const { otpEmailTemplate } = require("../email_templates/otpEmail");
const { welcomeEmailTemplate } = require("../email_templates/welcomeEmail");
const {
  enrollmentEmailTemplate,
} = require("../email_templates/enrollmentEmail");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// OTP Email Template
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND || "LearnityxAi"}" <${
        process.env.EMAIL_USER
      }>`,
      to: email,
      subject: "Your Password Reset Code",
      html: otpEmailTemplate(otp, userName),
      attachments: [
        {
          filename: "logo.png",
          path: process.env.LOGO_PATH || "./assets/logo.png",
          cid: "logo",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "OTP email sent successfully",
    };
  } catch (error) {
    console.error("OTP Email sending error: ", error);
    throw new Error("Failed to send OTP");
  }
};

// Welcome Email Template
const sendWelcomeEmail = async (email, userName, role) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND || "LearnityxAi"}" <${
        process.env.EMAIL_USER
      }>`,
      to: email,
      subject: `Welcome to LearnityxAi, ${userName}!`,
      html: welcomeEmailTemplate(userName, role),
      attachments: [
        {
          filename: "logo.png",
          path: process.env.LOGO_PATH || "./assets/logo.png",
          cid: "logo",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  } catch (error) {
    console.error("Welcome email sending error: ", error);
    return {
      success: false,
      message: "Failed to send welcome email",
    };
  }
};

// Course Enrollment Confirmation Email
const sendEnrollmentEmail = async (
  email,
  userName,
  courseName,
  instructorName,
  courseDetails
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND || "LearnityxAi"}" <${
        process.env.EMAIL_USER
      }>`,
      to: email,
      subject: `Enrollment Confirmed: ${courseName}`,
      html: enrollmentEmailTemplate(
        userName,
        courseName,
        instructorName,
        courseDetails
      ),
      attachments: [
        {
          filename: "logo.png",
          path: process.env.LOGO_PATH || "./assets/logo.png",
          cid: "logo",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Enrollment confirmation email sent successfully",
    };
  } catch (error) {
    console.error("Enrollment email sending error: ", error);
    return {
      success: false,
      message: "Failed to send enrollment confirmation email",
    };
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendEnrollmentEmail,
};
