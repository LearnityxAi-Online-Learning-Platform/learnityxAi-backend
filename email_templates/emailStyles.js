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

module.exports = { getEmailStyles };
