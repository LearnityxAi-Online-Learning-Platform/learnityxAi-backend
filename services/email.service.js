const nodemailer = require("nodemailer");

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

// Base email styles for consistency
const getEmailStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333333;
    background-color: #f5f7fa;
    padding: 20px;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #7B8FE6 0%, #DDD6FE 100%);
    padding: 40px 30px;
    text-align: center;
  }
  .logo {
    max-width: 150px;
    height: auto;
    margin-bottom: 15px;
  }
  .header h1 {
    color: #ffffff;
    font-size: 28px;
    font-weight: 600;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .content {
    padding: 40px 30px;
    background-color: #ffffff;
  }
  .content p {
    margin-bottom: 16px;
    color: #4a5568;
    font-size: 16px;
    line-height: 1.6;
  }
  .content strong {
    color: #2C3E9F;
    font-weight: 600;
  }
  .otp-container {
    background: linear-gradient(135deg, #f0f4ff 0%, #f3e8ff 100%);
    border: 2px solid #8B5CF6;
    border-radius: 12px;
    padding: 30px;
    text-align: center;
    margin: 30px 0;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
  }
  .otp-label {
    color: #2C3E9F;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .otp-code {
    font-size: 42px;
    font-weight: 700;
    letter-spacing: 8px;
    color: #2C3E9F;
    margin: 10px 0;
    font-family: 'Courier New', monospace;
  }
  .otp-expiry {
    color: #e53e3e;
    font-size: 14px;
    font-weight: 600;
    margin-top: 15px;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, #2C3E9F 0%, #8B5CF6 100%);
    color: #ffffff !important;
    padding: 14px 32px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    margin: 20px 0;
    box-shadow: 0 4px 12px rgba(44, 62, 159, 0.3);
    transition: transform 0.2s;
  }
  .info-box {
    background-color: #f0f4ff;
    border-left: 4px solid #00D4FF;
    padding: 16px 20px;
    margin: 20px 0;
    border-radius: 4px;
  }
  .info-box p {
    margin: 0;
    color: #2C3E9F;
    font-size: 14px;
  }
  .divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #e2e8f0, transparent);
    margin: 30px 0;
  }
  .footer {
    background-color: #f8fafc;
    padding: 30px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
  }
  .footer p {
    margin: 8px 0;
    color: #718096;
    font-size: 13px;
  }
  .footer-links {
    margin: 15px 0;
  }
  .footer-links a {
    color: #2C3E9F;
    text-decoration: none;
    margin: 0 10px;
    font-size: 13px;
  }
  .social-icons {
    margin-top: 15px;
  }
  .social-icons a {
    display: inline-block;
    margin: 0 8px;
    color: #8B5CF6;
    text-decoration: none;
  }
  @media only screen and (max-width: 600px) {
    body {
      padding: 10px;
    }
    .header {
      padding: 30px 20px;
    }
    .header h1 {
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .otp-code {
      font-size: 36px;
      letter-spacing: 6px;
    }
    .cta-button {
      padding: 12px 24px;
      font-size: 14px;
    }
  }
`;

// OTP Email Template
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND || "LearnityyxAi"}" <${
        process.env.EMAIL_USER
      }>`,
      to: email,
      subject: "Your Password Reset Code",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <img src="cid:logo" alt="LearnityyxAi" class="logo">
              <h1>Password Reset Request</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>We received a request to reset your password for your LearnityyxAi account. Use the verification code below to complete the process:</p>
              
              <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">This code expires in 10 minutes</div>
              </div>
              
              <div class="info-box">
                <p><strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately if you have concerns about your account security.</p>
              </div>
              
              <div class="divider"></div>
              
              <p>For your security:</p>
              <p style="padding-left: 20px;">
                • Never share this code with anyone<br>
                • Our team will never ask for your password or verification code<br>
                • This code can only be used once
              </p>
              
              <p style="margin-top: 30px;">Best regards,<br><strong>The LearnityyxAi Team</strong></p>
            </div>
            
            <div class="footer">
              <p><strong>LearnityyxAi</strong> - Empowering Learning with AI</p>
              <div class="footer-links">
                <a href="#">Help Center</a> | 
                <a href="#">Contact Support</a> | 
                <a href="#">Privacy Policy</a>
              </div>
              <p style="margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
              <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} LearnityyxAi. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
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

    const isInstructor = role === "instructor";
    const roleTitle = isInstructor ? "Instructor" : "Student";
    const roleAction = isInstructor
      ? "creating amazing courses"
      : "exploring our course library";
    const roleMessage = isInstructor
      ? "You now have access to our instructor dashboard where you can create, manage, and publish your courses to thousands of eager learners."
      : "You now have access to thousands of courses across various topics, all powered by cutting-edge AI technology to enhance your learning experience.";

    const mailOptions = {
      from: `"${process.env.BRAND || "LearnityyxAi"}" <${
        process.env.EMAIL_USER
      }>`,
      to: email,
      subject: `Welcome to LearnityyxAi, ${userName}!`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <img src="cid:logo" alt="LearnityyxAi" class="logo">
              <h1>Welcome to LearnityyxAi!</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>Welcome to <strong>LearnityyxAi</strong>! We're thrilled to have you join our community as ${
                isInstructor ? "an" : "a"
              } <strong>${roleTitle}</strong>.</p>
              
              <div class="info-box">
                <p><strong>Your Account Status:</strong> Active and ready to go!</p>
              </div>
              
              <p>${roleMessage}</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${
                  process.env.PLATFORM_URL || "https://learnityyxai.com"
                }/dashboard" class="cta-button">
                  Go to Dashboard →
                </a>
              </div>
              
              <div class="divider"></div>
              
              <p><strong>Getting Started:</strong></p>
              <p style="padding-left: 20px;">
                ${
                  isInstructor
                    ? "• Set up your instructor profile<br>• Create your first course<br>• Explore our course creation tools<br>• Review best practices for engaging content"
                    : "• Complete your profile<br>• Browse our course catalog<br>• Enroll in your first course<br>• Join our learning community"
                }
              </p>
              
              <div class="divider"></div>
              
              <p><strong>Need Help?</strong></p>
              <p>Our support team is here to help you succeed. Don't hesitate to reach out if you have any questions or need assistance getting started.</p>
              
              <p style="margin-top: 30px;">Happy ${
                isInstructor ? "Teaching" : "Learning"
              }!<br><strong>The LearnityyxAi Team</strong></p>
            </div>
            
            <div class="footer">
              <p><strong>LearnityyxAi</strong> - Empowering Learning with AI</p>
              <div class="footer-links">
                <a href="#">Help Center</a> | 
                <a href="#">Getting Started Guide</a> | 
                <a href="#">Community</a>
              </div>
              <div class="social-icons">
                <a href="#">Twitter</a> | 
                <a href="#">LinkedIn</a> | 
                <a href="#">Facebook</a>
              </div>
              <p style="margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
              <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} LearnityyxAi. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
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
  instructorName
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND || "LearnityyxAi"}" <${
        process.env.EMAIL_USER
      }>`,
      to: email,
      subject: `Enrollment Confirmed: ${courseName}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Course Enrollment Confirmation</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <img src="cid:logo" alt="LearnityyxAi" class="logo">
              <h1>Enrollment Confirmed!</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>Great news! You've successfully enrolled in:</p>
              
              <div class="otp-container" style="border: 2px solid #00D4FF;">
                <div class="otp-label">Course</div>
                <div style="font-size: 24px; font-weight: 600; color: #2C3E9F; margin: 10px 0; letter-spacing: normal;">
                  ${courseName}
                </div>
                <p style="margin: 10px 0 0 0; color: #718096; font-size: 14px;">
                  Instructor: <strong style="color: #8B5CF6;">${instructorName}</strong>
                </p>
              </div>
              
              <p>You can start learning right away! Access your course materials, track your progress, and engage with the community.</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${
                  process.env.PLATFORM_URL || "https://learnityyxai.com"
                }/courses" class="cta-button">
                  Start Learning →
                </a>
              </div>
              
              <div class="divider"></div>
              
              <p><strong>What's Next?</strong></p>
              <p style="padding-left: 20px;">
                • Access your course dashboard<br>
                • Review the course syllabus<br>
                • Meet your fellow learners<br>
                • Track your progress
              </p>
              
              <p style="margin-top: 30px;">Happy Learning!<br><strong>The LearnityyxAi Team</strong></p>
            </div>
            
            <div class="footer">
              <p><strong>LearnityyxAi</strong> - Empowering Learning with AI</p>
              <div class="footer-links">
                <a href="#">My Courses</a> | 
                <a href="#">Help Center</a> | 
                <a href="#">Contact Support</a>
              </div>
              <p style="margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
              <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} LearnityyxAi. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
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
