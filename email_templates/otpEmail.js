const { getEmailStyles } = require("./emailStyles");

const otpEmailTemplate = (otp, userName) => {
  return `
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
          <img src="cid:logo" alt="LearnityxAi" class="logo">
          <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>We received a request to reset your password for your LearnityxAi account. Use the verification code below to complete the process:</p>
          
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
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The LearnityxAi Team</strong></p>
        </div>
        
        <div class="footer">
          <p><strong>LearnityxAi</strong> - Empowering Learning with AI</p>
          <div class="footer-links">
            <a href="#">Help Center</a> | 
            <a href="#">Contact Support</a> | 
            <a href="#">Privacy Policy</a>
          </div>
          <p style="margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
          <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} LearnityxAi. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { otpEmailTemplate };
