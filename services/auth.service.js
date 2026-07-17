/**
 * Auth Service
 * Business logic layer - handles registration, login, password hashing, JWT
 * No direct SQL queries - delegates to repository
 */
const crypto = require('crypto');
const env = require("../config/env");
const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const {transaction} = require("../config/db")
const { generateAccessToken } = require('../utils/jwt'); // need
const { hashOTP , compareOTP, hashPassword } = require('../utils/password'); // need
const ErrorHandler = require('../utils/ErrorHandler'); // need
const { HTTP_STATUS, VALIDATION_MESSAGES, ERROR_MESSAGES , SUCCESS_MESSAGES } = require('../utils/constants');
const emailService = require('./email.service');


/**
 * Register a new user
 * @param {Object} userData - Sanitized user data
 * @returns {Promise<Object>} - { user, token }
 */

// Generate cryptographically secure 6-digit OTP
const generateSecureOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const getOTPExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + env.OTP_EXPIRY_MINUTES);
  return expiry;
};



const registerUser = async (userData) => {
  const { name, email, password, role } = userData;

  // Check for duplicate email (business rule)
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new ErrorHandler(VALIDATION_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT);
  }

  // Hash password before storing
  const passwordHash = await hashPassword(password);

  // Create user in database
  const user = await userRepository.createUser({
    name,
    email,
    passwordHash,
    role,
  });
  // Create student Profile
  // Send OTP

  // Generate JWT token
  const token = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // Return user without sensitive data + token
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    },
    token,
  };
};


const registerStudent = async (userData) => {
  const { name, email, password, role } = userData;
  console.log(name,email,password,role);

  return await transaction(async (client) => {
   
    // 1. Check for duplicate email (business rule)
    const existingUser = await userRepository.findUserByEmail(email);
    if (existingUser) {
        throw new ErrorHandler(VALIDATION_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT);
    }

    // 2. Hash password before storing
    const passwordHash = await hashPassword(password);

    // 3. Create user
    const user = await userRepository.createUser(
      { name, email, passwordHash, role }, client
    );
     

    // 4. Generate and hash OTP
    const otp = generateSecureOTP();
   const otpHash = await hashOTP(otp);
    
    const expiresAt = getOTPExpiry();

    // 5. Store OTP
    await otpRepository.createOTP(
      { userId: user.id, otpHash, expiresAt }, client
    );

    // Return OTP for email sending (outside transaction)
    return { user, otp };
  }).then(async (result) => {
    // Send email AFTER successful transaction
    try {
      await emailService.sendVerificationEmail(email, name, result.otp);
    } catch (emailError) {
      console.error('Email send failed:', emailError.message);
      // Don't fail registration - user can resend OTP
    }

    // Generate Access token
    const token = generateAccessToken({
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.USER_REGISTERED,
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          // role: result.user.role,
          // is_email_verified: result.user.is_email_verified
        },
        token,
        expires_in: "10 minutes"
      }
    };
  });
};

const verifyEmail = async (email, otp) => {
  return await transaction(async (client) => {
    // 1. Find user
    const user = await userRepository.findUserByEmail(email, client);

   
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Validate role
    if (user.role !== 'student') {
      throw new ErrorHandler(ERROR_MESSAGES.INVALID_ROLE, HTTP_STATUS.FORBIDDEN);
    }

    // 3. Check already verified
    if (user.is_email_verified) {
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
    }

    // 4. Get latest OTP
    const latestOTP = await otpRepository.findLatestOTPByUserId(user.id, client);
    if (!latestOTP) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }


    // 5. Check used
    if (latestOTP.is_used) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_ALREADY_USED, HTTP_STATUS.BAD_REQUEST);
    }

    // 6. Check expired
    if (new Date() > new Date(latestOTP.expires_at)) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    // 7. Compare OTP with bcrypt
    const isValidOTP = await compareOTP(otp, latestOTP.otp_hash);

    
    if (!isValidOTP) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    // 8. Mark OTP used
    await otpRepository.markOTPAsUsed(latestOTP.id, client);

    // 9. Update user
    const updatedUser = await userRepository.updateEmailVerified(user.id, client);

    console.log(updatedUser.is_email_verified + "Updated User");

    // 10. Generate new token
    // const token = generateToken({
    //   id: updatedUser.id,
    //   email: updatedUser.email,
    //   role: updatedUser.role,
    //   name: updatedUser.name
    // });

    const token = generateAccessToken({
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    });


    return {
      success: true,
      message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          is_email_verified: updatedUser.is_email_verified
        },
        token,
        expires_in: env.JWT_EXPIRES_IN
      }
    };
  });
};





/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - { user, token }
 */
const loginUser = async (credentials) => {
  const { email, password } = credentials;

  // Find user by email
  const user = await userRepository.findUserByEmail(email);

  // Generic error to prevent user enumeration attacks (OWASP)
  if (!user) {
    throw new ErrorHandler(ERROR_MESSAGES.LOGIN_FAILED, HTTP_STATUS.UNAUTHORIZED);
  }

  // Verify password
  const { comparePassword } = require('../utils/password');
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new ErrorHandler(ERROR_MESSAGES.LOGIN_FAILED, HTTP_STATUS.UNAUTHORIZED);
  }

  // Generate JWT token
  const token = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

module.exports = {
  registerUser,
  registerStudent,
  loginUser,
  verifyEmail
};