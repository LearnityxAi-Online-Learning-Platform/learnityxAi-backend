const { getEmailStyles } = require("./emailStyles");

const enrollmentEmailTemplate = (userName, courseName, instructorName) => {
  return `
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
          <img src="cid:logo" alt="LearnityxAi" class="logo">
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
              process.env.PLATFORM_URL || "https://learnityxai.com"
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
          
          <p style="margin-top: 30px;">Happy Learning!<br><strong>The LearnityxAi Team</strong></p>
        </div>
        
        <div class="footer">
          <p><strong>LearnityxAi</strong> - Empowering Learning with AI</p>
          <div class="footer-links">
            <a href="#">My Courses</a> | 
            <a href="#">Help Center</a> | 
            <a href="#">Contact Support</a>
          </div>
          <p style="margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
          <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} LearnityxAi. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { enrollmentEmailTemplate };
