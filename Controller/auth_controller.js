const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorhandler");
const bcrypt = require('bcryptjs');
const sendToken = require("../utils/jwt");
const JWT_SECRET = process.env.JWT_SECRET;
const {pool} = require("../config/db");


const authService = require('../services/auth.service');
const { validateRegistration, sanitizeResendOTP ,validateResendOTP , validateLogin, sanitizeRegistrationInput ,validateVerifyEmail,sanitizeVerifyEmailInput} = require('../validators/auth.validator');

const { HTTP_STATUS } = require('../utils/constants');
const { generateOTP } = require('../utils/otp');
const {sendOTPEmail} = require("../services/email.service");
const errors = require("../middleware/errors");



// Register User
exports.registerUser = catchAsyncError(async (req, res, next) => {

  // 1. Validate input
  const validationErrors = await validateRegistration(req.body);
  if (validationErrors.errors.length > 0 && validationErrors.errorCode.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validationErrors.errors[0],
      errorCode: validationErrors.errorCode[0],
    });
  }

  // 2. Sanitize input (trim, normalize email)
  const sanitizedData = sanitizeRegistrationInput(req.body);

  // 3. Call service for business logic
  const result = await authService.registerStudent(sanitizedData);

  // 4. Return success response
  res.status(HTTP_STATUS.CREATED).json(result);
});


// Verify Email
exports.verifyEmail = catchAsyncError(async (req, res, next) => {
    
  // 1. Validate input
  const validationErrors = await validateVerifyEmail(req.body);
  if (validationErrors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validationErrors[0],
       errorCode: validationErrors.errorCode[0],
    });
  }

  // 2. Sanitize input (trim, normalize email)
  const sanitizedData = sanitizeVerifyEmailInput(req.body);
  const { email, otp } = sanitizedData; 
  const result = await authService.verifyEmail(email, otp);
  res.status(HTTP_STATUS.OK).json(result);
});

// NEW: Resend OTP (with 30-second cooldown)
exports.resendOTP = catchAsyncError(async (req, res, next) => {
  // Validation is handled by middleware
  const { email } = req.body;

  const validationErrors = await validateResendOTP(req.body);
  if (validationErrors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validationErrors[0],
    });
  }
  const sanitizedData = sanitizeResendOTP(req.body);

  const result = await authService.resendOTP(sanitizedData.email);

  res.status(HTTP_STATUS.OK).json(result);
});




exports.loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.sanitizedData;

  const result = await authService.login(email, password);

  // Return 200 for both cases (profile completed or not)
  res.status(HTTP_STATUS.OK).json(result);
});


// Worker Controllers
exports.sendWorkerOTP = catchAsyncError(async (req, res, next) => {
  const { worker_id } = req.sanitizedData;
  const result = await authService.sendWorkerOTP(worker_id);
  res.status(HTTP_STATUS.OK).json(result);
});

exports.verifyWorkerOTP = catchAsyncError(async (req, res, next) => {
  const { worker_id, otp } = req.sanitizedData;
  const result = await authService.verifyWorkerOTP(worker_id, otp);
  res.status(HTTP_STATUS.OK).json(result);
});

exports.completeWorkerRegistration = catchAsyncError(async (req, res, next) => {
  const { worker_id, password, verification_token } = req.sanitizedData;
  
  if (!req.file) {
    const ErrorHandler = require('../utils/errorHandler');
    throw new ErrorHandler('ID card image is required', HTTP_STATUS.BAD_REQUEST);
  }
  console.log("this is buffer",req.file.buffer);
  const result = await authService.completeWorkerRegistration(
    worker_id, password, verification_token, req.file.buffer
  );

  res.status(HTTP_STATUS.CREATED).json(result);
});



// Register Student
exports.completeStudentRegistration = catchAsyncError(async (req, res, next) => {
  // Validation handled by middleware
  const { roll_no, phone_no } = req.sanitizedData;
  
  // user_id from JWT token (set by authenticate middleware)
  const userId = req.user.id;

  const result = await authService.completeStudentRegistration(userId, roll_no, phone_no);

  res.status(HTTP_STATUS.CREATED).json(result);
});
exports.getMyProfile = catchAsyncError(async (req, res, next) => {
  
  
  // user_id from JWT token (set by authenticate middleware)
  const userId = req.user.id;

  const result = await authService.getUserProfile(userId);

  res.status(HTTP_STATUS.CREATED).json(result);
});

// Register Faculty
exports.completeFacultyRegistration = catchAsyncError(async (req, res, next) => {
  // Validation handled by middleware
  const { faculty_id, faculty_type, phone_no } = req.sanitizedData;
  
  // user_id from JWT token (set by authenticate middleware)
  const userId = req.user.id;

  const result = await authService.completeFacultyRegistration(
    userId, faculty_id, faculty_type, phone_no
  );

  res.status(HTTP_STATUS.CREATED).json(result);
});


exports.refreshToken = catchAsyncError(async (req, res, next) => {
  const { refresh_token } = req.sanitizedData;

  const result = await authService.refreshAccessToken(refresh_token);

  res.status(HTTP_STATUS.OK).json(result);
});