const { getEmailStyles } = require("./emailStyles");

const enrollmentEmailTemplate = (
  userName,
  courseName,
  instructorName,
  courseDetails
) => {
  const {
    startingDate,
    duration,
    description,
    price,
    courseFlyerURL,
    skills,
    tools,
  } = courseDetails;

  // Format the starting date prominently
  const formattedDate = new Date(startingDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format skills list
  const skillsList =
    skills && skills.length > 0
      ? skills
          .map((skill) => `<span class="skill-tag">${skill}</span>`)
          .join("")
      : "";

  // Format tools list
  const toolsList =
    tools && tools.length > 0
      ? tools.map((tool) => `<span class="tool-tag">${tool}</span>`).join("")
      : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <style>
        ${getEmailStyles()}
        
        /* Additional styles for enrollment email */
        .success-banner {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 30px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .success-banner h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .success-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        .course-banner {
          width: 100%;
          height: 250px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 25px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .course-title {
          font-size: 26px;
          color: #2C3E9F;
          font-weight: 700;
          margin: 20px 0;
          text-align: center;
          line-height: 1.3;
        }
        
        .starting-date-highlight {
          background: linear-gradient(135deg, #2C3E9F 0%, #8B5CF6 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 6px 20px rgba(44, 62, 159, 0.4);
        }
        
        .starting-date-highlight .label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
          opacity: 0.9;
          font-weight: 600;
        }
        
        .starting-date-highlight .date {
          font-size: 32px;
          font-weight: 700;
          margin: 10px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .starting-date-highlight .icon {
          font-size: 40px;
          margin-bottom: 10px;
        }
        
        .course-details-grid {
          width: 100%;
          margin: 25px 0;
        }

        .detail-card {
          background: linear-gradient(135deg, #f0f4ff 0%, #f3e8ff 100%);
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #8B5CF6;
          text-align: center;
          width: 48%;
          display: inline-block;
          vertical-align: top;
          box-sizing: border-box;
        }
        
        .detail-card .label {
          font-size: 12px;
          color: #2C3E9F;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .detail-card .value {
          font-size: 20px;
          color: #2C3E9F;
          font-weight: 700;
        }
        
        .description-box {
          background-color: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
          line-height: 1.8;
        }
        
        .description-box h3 {
          color: #2C3E9F;
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .skills-section {
          margin: 30px 0;
        }
        
        .skills-section h3 {
          color: #2C3E9F;
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .tags-container {
          margin-top: 12px;
          text-align: center;
        }

        .skill-tag, .tool-tag {
          background: linear-gradient(135deg, #2C3E9F 0%, #8B5CF6 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          display: inline-block;
          box-shadow: 0 2px 6px rgba(44, 62, 159, 0.3);
          margin: 5px;
        }
        
        .tool-tag {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }
        
        .instructor-card {
          background: linear-gradient(135deg, #f0f4ff 0%, #f3e8ff 100%);
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          border: 2px solid #8B5CF6;
        }
        
        .instructor-card .icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        .instructor-card .title {
          font-size: 14px;
          color: #2C3E9F;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .instructor-card .name {
          font-size: 22px;
          color: #2C3E9F;
          font-weight: 700;
        }
        
        .next-steps {
          background-color: #f0f4ff;
          border-left: 4px solid #00D4FF;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        
        .next-steps h3 {
          color: #2C3E9F;
          margin-top: 0;
          font-size: 18px;
          margin-bottom: 12px;
        }
        
        .next-steps ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .next-steps li {
          color: #4a5568;
          margin: 8px 0;
          line-height: 1.6;
        }
        
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 10px !important;
          }

          .content {
            padding: 20px !important;
          }

          .detail-card {
            width: 100% !important;
            display: block !important;
            margin: 0 0 15px 0 !important;
          }

          .starting-date-highlight {
            padding: 20px !important;
          }

          .starting-date-highlight .date {
            font-size: 24px !important;
          }

          .course-title {
            font-size: 20px !important;
          }

          .course-banner {
            height: 200px !important;
          }

          .success-banner h2 {
            font-size: 20px !important;
          }

          .skill-tag, .tool-tag {
            font-size: 12px !important;
            padding: 6px 12px !important;
          }

          .cta-button {
            width: 100% !important;
            padding: 15px !important;
          }

          .description-box, .next-steps, .instructor-card {
            padding: 15px !important;
          }
        }

        /* Outlook specific fixes */
        @media screen and (-webkit-min-device-pixel-ratio:0) {
          .skill-tag, .tool-tag {
            display: inline-block !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <img src="cid:logo" alt="LearnityxAi" class="logo">
          <h1>Enrollment Confirmed!</h1>
        </div>
        
        <div class="content">
          <div class="success-banner">
            <div class="success-icon">✓</div>
            <h2>Successfully Enrolled!</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">You're all set to start your learning journey</p>
          </div>

          <p>Hello <strong>${userName}</strong>,</p>
          
          <p>Congratulations! You have successfully enrolled in the course. We're excited to have you join this learning experience!</p>

          ${
            courseFlyerURL
              ? `<img src="${courseFlyerURL}" alt="${courseName}" class="course-banner">`
              : ""
          }

          <h2 class="course-title">${courseName}</h2>

          <!-- Starting Date - Big Highlight -->
          <div class="starting-date-highlight">
            <div class="icon"></div>
            <div class="label">Course Starts On</div>
            <div class="date">${formattedDate}</div>
            <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">Mark your calendar!</p>
          </div>

          <!-- Course Details Grid -->
          <div class="course-details-grid">
            <div class="detail-card" style="margin-right: 2%;">
              <div class="label">Duration</div>
              <div class="value">${duration}</div>
            </div><!--
            --><div class="detail-card" style="margin-left: 2%;">
              <div class="label">Course Fee</div>
              <div class="value">$${price}</div>
            </div>
          </div>

          <!-- Course Description -->
          <div class="description-box">
            <h3>About This Course</h3>
            <p style="margin: 0; color: #4a5568;">${description}</p>
          </div>

          <!-- Skills Section -->
          ${
            skillsList
              ? `
          <div class="skills-section">
            <h3>Skills You Will Gain</h3>
            <div class="tags-container">
              ${skillsList}
            </div>
          </div>
          `
              : ""
          }

          <!-- Tools Section -->
          ${
            toolsList
              ? `
          <div class="skills-section">
            <h3>Tools You Will Learn</h3>
            <div class="tags-container">
              ${toolsList}
            </div>
          </div>
          `
              : ""
          }

          <!-- Instructor Information -->
          <div class="instructor-card">
            <div class="title">Your Instructor</div>
            <div class="name">${instructorName}</div>
          </div>

          <!-- Next Steps -->
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>Access your course dashboard from your account</li>
              <li>Review the course materials before the start date</li>
              <li>Join the course community and connect with fellow learners</li>
              <li>Prepare any required materials or prerequisites</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.FRONTEND_URL ||
              "http://www.learnityxai.corespace.click/my-courses"
            }/student/enrolled" class="cta-button">
              Access My Courses
            </a>
          </div>

          <div class="info-box">
            <p><strong>Need Help?</strong> If you have any questions about this course or need assistance, our support team is here to help. Contact us anytime!</p>
          </div>

          <div class="divider"></div>

          <p style="margin-top: 30px;">We're thrilled to have you on this learning journey. Get ready to enhance your skills and achieve your goals!</p>
          
          <p>Best regards,<br><strong>The LearnityxAi Team</strong></p>
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
