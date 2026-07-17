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
const {sendOTPEmail} = require("../services/email.service")



// Register User
exports.registerUser = catchAsyncError(async (req, res, next) => {

  // 1. Validate input
  const validationErrors = await validateRegistration(req.body);
  if (validationErrors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validationErrors[0],
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


exports.loginUser  = catchAsyncError(async (req, res, next) => {
  // 1. Validate input
  const validationErrors = await validateLogin(req.body);
  if (validationErrors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: validationErrors[0],
    });
  }

  // 2. Sanitize
  const credentials = {
    email: req.body.email.trim().toLowerCase(),
    password: req.body.password,
  };

  // 3. Call service
  const result = await authService.loginUser(credentials);

  // 4. Return response
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      token: result.token,
    },
  });
});


exports.login = catchAsyncError(async(req,res,next)=>{
    
          const {email,password} = req.body;

          // check user given password and email both
          if(!email || !password){
               return next(new ErrorHander("Please Enter email or password",400))
          }
          // Find User 
         const result = await pool.query( ` SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1 `, [email] );
         const user = result.rows[0];

         if(!user){
          return next(new ErrorHander("Incorrect username or password",400));
         }

         // Check account status 
         if (!user.is_active) {
             return next( new ErrorHandler("Account is disabled", 403) );
             }

             
         
          const ispasswordMatch = await bcrypt.compare( password, user.password_hash );
          if(!ispasswordMatch){
            return next(new ErrorHander("Incorrect password or username",400));
          }

          delete user.password_hash;


          const data = {
            userInfo:user
          }

          sendToken(data,JWT_SECRET,200,res);
})