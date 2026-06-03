const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    logger.error(`SMTP Connection Error: ${error.message}. Emails might fail to send.`);
  } else {
    logger.info('SMTP Server is ready to take messages');
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'IntellMeet <noreply@intellmeet.com>',
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    // Do not throw the error to prevent API request failure just because of email delivery issues
    return null;
  }
};

/**
 * Send email verification link to user
 * @param {string} email 
 * @param {string} token 
 */
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
      <h2 style="color: #3b82f6; text-align: center;">Welcome to IntellMeet</h2>
      <p>Hi there,</p>
      <p>Thank you for registering on IntellMeet — the AI-Powered Meeting & Collaboration Platform. Please click the button below to verify your email address and activate your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p>This verification link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">© 2026 IntellMeet. All rights reserved.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'IntellMeet - Verify Your Email Address',
    html
  });
};

/**
 * Send password reset link to user
 * @param {string} email 
 * @param {string} token 
 */
const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
      <h2 style="color: #ef4444; text-align: center;">Reset Your Password</h2>
      <p>Hi there,</p>
      <p>You are receiving this email because you (or someone else) requested a password reset for your IntellMeet account. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p>This reset link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">© 2026 IntellMeet. All rights reserved.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'IntellMeet - Reset Your Password',
    html
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
