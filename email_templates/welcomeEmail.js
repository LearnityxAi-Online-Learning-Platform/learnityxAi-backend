const { getEmailStyles } = require("./emailStyles");

const welcomeEmailTemplate = (userName, role) => {
  const isInstructor = role === "instructor";
  const roleTitle = isInstructor ? "Instructor" : "Student";
  const roleAction = isInstructor
    ? "creating amazing courses"
    : "exploring our course library";
  const roleMessage = isInstructor
    ? "You now have access to our instructor dashboard where you can create, manage, and publish your courses to thousands of eager learners."
    : "You now have access to thousands of courses across various topics, all powered by cutting-edge AI technology to enhance your learning experience.";

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
          <h1>Welcome to LearnityxAi!</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>Welcome to <strong>LearnityxAi</strong>! We're thrilled to have you join our community as ${
            isInstructor ? "an" : "a"
          } <strong>${roleTitle}</strong>.</p>
          
          <div class="info-box">
            <p><strong>Your Account Status:</strong> Active and ready to go!</p>
          </div>
          
          <p>${roleMessage}</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${
              process.env.PLATFORM_URL ||
              "https://www.learnityxai.corespace.click"
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
          }!<br><strong>The LearnityxAi Team</strong></p>
        </div>
        
        <div class="footer">
          <p><strong>LearnityxAi</strong> - Empowering Learning with AI</p>
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
          <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">© ${new Date().getFullYear()} LearnityxAi. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { welcomeEmailTemplate };
