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
      rejectUnauthorized: false
    }
  });
};

// OTP mail with template
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Resetting OTP",
      html: `
             <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 10px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .otp-box {
              background-color: #fff;
              border: 2px dashed #4CAF50;
              padding: 15px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              margin: 20px 0;
              color: #4CAF50;
            }
            .footer {
              text-align: center;
              padding: 10px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>We received a request to reset your password. Please use the following OTP to complete the process:</p>
              <div class="otp-box">
                ${otp}
              </div>
              <p><strong>This OTP will expire in 10 minutes.</strong></p>
              <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
              <p>Best regards,<br>Learning Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
          `,
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "OTP email sent successfully",
    };
  } catch (error) {
    console.error("OTP Email sending error: ", error);
    throw new Error("Faild to send OTP");
  }
};

const sendWelcomeEmail = async (email, userName, role) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BRAND}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to ${process.env.BRAND}`,
      html: `
          <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .header {
              background-color: #2196F3;
              color: white;
              padding: 10px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .footer {
              text-align: center;
              padding: 10px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to Learning Platform</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Thank you for registering as ${
                role === "instructor" ? "an instructor" : "a student"
              } on our Learning Platform!</p>
              <p>You can now log in and start ${
                role === "instructor" ? "creating courses" : "exploring courses"
              }.</p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Best regards,<br>Learning Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>`,
    };

    await transporter.sendMail(mailOptions);
    return {
        success: true,
        message: "Welcome email send successfully"
    }
  } catch (error) {
    console.error("Welcome email sending error: ", error );
    return {
      success: false,
      message: "Failed to send Welcome email send successfully",
    };
  }
};

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail
};
