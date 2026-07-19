// const { Resend } = require("resend");

// const {RESEND_API} = require("../config/env");
// const resend = new Resend(RESEND_API);

// const sendOTPEmail = async (email, otp) => {
//   try {
//     const response = await resend.emails.send({
//       from: "Swachh PU <auth@akagriexport.com>", // for testing
//       to: email,
//       subject: "Swachh PU Email Verification",
//       html: `
//         <h2>Email Verification</h2>
//         <p>Your OTP is:</p>
//         <h1>${otp}</h1>
//         <p>This OTP expires in 10 minutes.</p>
//       `,
//     });

//     return response;
//   } catch (error) {
//     console.error("Resend Error:", error);
//     throw error;
//   }
// };

// module.exports = {
//   sendOTPEmail,
// };
const { Resend } = require('resend');
const env = require('../config/env');
const ErrorHandler = require('../utils/errorhandler');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const resend = new Resend(env.RESEND_API);

const sendVerificationEmail = async (email, name, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: 'Verify Your Email - Swachh PU',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Hello ${name},</h2>
          <p>Your Swachh PU verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; 
                      font-weight: bold; letter-spacing: 8px; color: #667eea;">
            ${otp}
          </div>
          <p style="color: #e74c3c;">This code expires in 10 minutes.</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore.</p>
        </div>
      `,
      text: `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.`
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_SEND_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler(ERROR_MESSAGES.EMAIL_SEND_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
};

module.exports = { sendVerificationEmail };