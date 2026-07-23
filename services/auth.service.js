/**
 * Auth Service
 * Business logic layer - handles registration, login, password hashing, JWT
 * No direct SQL queries - delegates to repository
 */
const crypto = require('crypto');
const env = require("../config/env");
const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const otpRepositoryworker = require('../repositories/workerOtp.repository');
const workerMasterRepository = require('../repositories/workerMaster.repository');
const studentProfileRepository = require('../repositories/studentProfile.repository');
const workerProfileRespoiory = require("../repositories/workerProfile.repository");
const facultyProfileRepository = require('../repositories/facultyProfile.repository');
const worker = require('../repositories/workerMaster.repository');
const {transaction} = require("../config/db")
const { generateAccessToken , generateRegistrationToken , generateRefreshToken , verifyRefreshToken} = require('../utils/jwt'); // need
const { hashOTP , compareOTP, hashPassword } = require('../utils/password'); // need
const ErrorHandler = require('../utils/errorhandler'); // need
const { HTTP_STATUS, VALIDATION_MESSAGES, ERROR_MESSAGES , SUCCESS_MESSAGES , WORKER_STATUS } = require('../utils/constants');
const emailService = require('./email.service');
const cloudinaryService = require('./cloudinary.service');
const { comparePassword } = require('../utils/password');


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
        throw new ErrorHandler(VALIDATION_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT , "EMAIL_ALREADY_EXISTS");
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
          role: result.user.role,
          is_email_verified: result.user.is_email_verified
        },
        token,
        expires_in: "10 minutes"
      }
    };
  });
};


// NEW: Check OTP resend cooldown (30 seconds)
const checkResendCooldown = async (userId, client = null) => {
  const latestOTPCreatedAt = await otpRepository.getLatestOTPCreatedAt(userId, client);
  
  if (!latestOTPCreatedAt) {
    return { canResend: true, remainingSeconds: 0 };
  }
  
  const now = new Date();
  const lastSent = new Date(latestOTPCreatedAt);
  const elapsedMs = now - lastSent;
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
  
  if (elapsedMs < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    return { canResend: false, remainingSeconds };
  }
  
  return { canResend: true, remainingSeconds: 0 };
};

// NEW: Check hourly resend limit
const checkHourlyResendLimit = async (userId, client = null) => {
  const resendCount = await otpRepository.countResendsInLastHour(userId, client);
  return resendCount >= env.MAX_OTP_RESENDS_PER_HOUR;
};

// Resend OTP 
const resendOTP = async (email) => {
  return await transaction(async (client) => {
    // 1. Find user by email
    const user = await userRepository.findUserByEmail(email, client);
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Validate role is student
    if (user.role !== 'student') {
      throw new ErrorHandler(ERROR_MESSAGES.INVALID_ROLE, HTTP_STATUS.FORBIDDEN);
    }

    // 3. Check if email is already verified
    if (user.is_email_verified) {
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
    }

    // 4. Check 30-second cooldown
    const cooldownCheck = await checkResendCooldown(user.id, client);
    console.log("Time Remaining" + cooldownCheck.remainingSeconds);
    if (!cooldownCheck.canResend) {
      const errorMessage = `Please wait ${cooldownCheck.remainingSeconds} seconds before requesting a new OTP`;
      throw new ErrorHandler(
        errorMessage,
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }
    console.log("Time Remaining" + typeof(cooldownCheck.remainingSeconds));

    // 5. Check hourly resend limit (max 5 per hour)
    const hourlyLimitReached = await checkHourlyResendLimit(user.id, client);
    if (hourlyLimitReached) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_MAX_RESENDS, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // 6. Generate new OTP
    const otp = generateSecureOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = getOTPExpiry();

    // 7. Store new OTP in database
    await otpRepository.createOTP(
      { userId: user.id, otpHash, expiresAt },
      client
    );

    // Return OTP for email sending (outside transaction)
    return { user, otp };
  }).then(async (result) => {
    // Send email after successful transaction
    try {
      await emailService.sendVerificationEmail(email, result.user.name, result.otp);
    } catch (emailError) {
      console.error('Failed to send resend OTP email:', emailError.message);
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_SEND_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    // Generate Access token
    const token = generateAccessToken({
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.OTP_RESENT,
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          is_email_verified: result.user.is_email_verified
        },
        token,
        expires_in: env.JWT_EXPIRES_IN,
        cooldown_seconds: env.OTP_RESEND_COOLDOWN_SECONDS  // ← Tell mobile app the cooldown
      }
    };
  });
};

const verifyEmail = async (email, otp) => {
  return await transaction(async (client) => {
    // 1. Find user
    const user = await userRepository.findUserByEmail(email, client);

   
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND,"USER_NOT_FOUND");
    }

    // // 2. Validate role
    // if (user.role !== 'student') {
    //   throw new ErrorHandler(ERROR_MESSAGES.INVALID_ROLE, HTTP_STATUS.FORBIDDEN);
    // }

    // 3. Check already verified
    if (user.is_email_verified) {
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST,"ALREADY_VERIFY");
    }

    // 4. Get latest OTP
    const latestOTP = await otpRepository.findLatestOTPByUserId(user.id, client);
    if (!latestOTP) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND,"OTP_NOT_FOUND");
    }


    // 5. Check used
    if (latestOTP.is_used) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_ALREADY_USED, HTTP_STATUS.BAD_REQUEST,"OTP_ALREADY_USE");
    }

    // 6. Check expired
    if (new Date() > new Date(latestOTP.expires_at)) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST,"OTP_EXPIRED");
    }

    // 7. Compare OTP with bcrypt
    const isValidOTP = await compareOTP(otp, latestOTP.otp_hash);

    
    if (!isValidOTP) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_INVALID, HTTP_STATUS.BAD_REQUEST,"INVALID_OTP");
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



// Check if profile is completed based on role
const isProfileCompleted = async (userId, role) => {
  if (role === 'student') {
    return await studentProfileRepository.checkProfileExists(userId);
  }
  if (role === 'faculty') {
    return await facultyProfileRepository.checkProfileExists(userId);
  }
  if (role === 'worker') {
    return await workerProfileRespoiory.checkProfileExists(userId);
    return false;
  }
  return false;
};

// Get next step based on role
const getNextStep = (role) => {
  const steps = {
    student: 'COMPLETE_STUDENT_REGISTRATION',
    faculty: 'COMPLETE_FACULTY_REGISTRATION',
    worker: 'COMPLETE_WORKER_REGISTRATION'
  };
  return steps[role] || 'complete_registration';
};


// ═══════════════════════════════════════════════════════════════
// LOGIN SERVICE
// ═══════════════════════════════════════════════════════════════
const login = async (email, password) => {
  // STEP 3: Find user by email (with password hash)
  const user = await userRepository.findUserByEmailWithPassword(email);
  if (!user) {
    throw new ErrorHandler(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  // STEP 4: Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ErrorHandler(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  // STEP 5: Check email is verified
  if (!user.is_email_verified) {
    return await transaction(async (client) => {
    // 1. Find user by email
    const user = await userRepository.findUserByEmail(email, client);
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    

    // 3. Check if email is already verified
    if (user.is_email_verified) {
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
    }

    // 4. Check 30-second cooldown
    const cooldownCheck = await checkResendCooldown(user.id, client);
    console.log("Time Remaining" + cooldownCheck.remainingSeconds);
    if (!cooldownCheck.canResend) {
      const errorMessage = `Please wait ${cooldownCheck.remainingSeconds} seconds before requesting a new OTP`;
      throw new ErrorHandler(
        errorMessage,
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }
    console.log("Time Remaining" + typeof(cooldownCheck.remainingSeconds));

    // 5. Check hourly resend limit (max 5 per hour)
    const hourlyLimitReached = await checkHourlyResendLimit(user.id, client);
    if (hourlyLimitReached) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_MAX_RESENDS, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // 6. Generate new OTP
    const otp = generateSecureOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = getOTPExpiry();

    // 7. Store new OTP in database
    await otpRepository.createOTP(
      { userId: user.id, otpHash, expiresAt },
      client
    );

    // Return OTP for email sending (outside transaction)
    return { user, otp };
  }).then(async (result) => {
    // Send email after successful transaction
    try {
      await emailService.sendVerificationEmail(email, result.user.name, result.otp);
    } catch (emailError) {
      console.error('Failed to send resend OTP email:', emailError.message);
      throw new ErrorHandler(ERROR_MESSAGES.EMAIL_SEND_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    

    return {
      success: true,
      profile_completed: false,
      message:"Email not verify. An OTP is send to you email",
      registration_token: "NOT REQUIRED",
      role: user.role,
      next_step: "OTP_VERIFICATION"
    };
  });
    
   
  }

  // STEP 6: Check profile completion
  const profileCompleted = await isProfileCompleted(user.id, user.role);

  // ─── CASE: Profile NOT completed ───
  if (!profileCompleted) {
    // Generate registration token (24 hours, limited scope)
    const registrationToken = generateRegistrationToken({
      id: user.id,
      role: user.role
    });

    return {
      success: true,
      profile_completed: false,
      message: SUCCESS_MESSAGES.PROFILE_COMPLETION_REQUIRED,
      registration_token: registrationToken,
      role: user.role,
      next_step: getNextStep(user.role)
    };
  }

  // ─── CASE: Profile completed ───
  // Generate access token (15 minutes)
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  // Generate refresh token (30 days)
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return {
    success: true,
    profile_completed: true,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};





//-------------- workerAuthService ------------------//


// ═══════════════════════════════════════════════════════════════
// STEP 1: SEND OTP
// ═══════════════════════════════════════════════════════════════
const sendWorkerOTP = async (workerId) => {
  return await transaction(async (client) => {
    // 1. Find worker in master table
    const worker = await workerMasterRepository.findWorkerByIdWithEmail(workerId, client);
    if (!worker) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Verify worker is active
    if (!worker.is_active) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_INACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    // 3. Verify email exists (FROM MASTER, never from client)
    if (!worker.email) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_NO_EMAIL, HTTP_STATUS.BAD_REQUEST);
    }

    // 4. Check already registered
    const alreadyRegistered = await workerProfileRepository.checkWorkerAlreadyRegistered(workerId, client);
    if (alreadyRegistered) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_ALREADY_REGISTERED, HTTP_STATUS.CONFLICT);
    }

    // 5. Check 30-second cooldown
    const cooldownCheck = await checkResendCooldown(worker.id, client);
    if (!cooldownCheck.canResend) {
      throw new ErrorHandler(
        ERROR_MESSAGES.OTP_RESEND_COOLDOWN(cooldownCheck.remainingSeconds),
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }

    // 6. Check 5/hour limit
    const hourlyLimitReached = await checkHourlyResendLimit(worker.id, client);
    if (hourlyLimitReached) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_MAX_RESENDS, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // 7. Generate and hash OTP
    const otp = generateSecureOTP();
    console.log("type of OTP is :", typeof(otp));
    const otpHash = await hashOTP(otp);
    const expiresAt = getOTPExpiry();
    console.log("Before ");
    // 8. Store OTP (using worker_master.id as user_id)
    await otpRepositoryworker.createOTPWorker({ userId: worker.id, otpHash, expiresAt }, client);

    console.log("Hello world");
    console.log(worker, otp);
    return { worker, otp };
  }).then(async (result) => {
    // Send email AFTER transaction commits
    await emailService.sendVerificationEmail(result.worker.email, result.worker.full_name, result.otp);
     

    return {
      success: true,
      message: SUCCESS_MESSAGES.OTP_SENT,
      data: {
        master_worker_id:result.worker.id,
        worker_id: result.worker.worker_id,
        full_name:result.worker.full_name,
        department:result.worker.department,
        designation:result.worker.designation,
        status:result.worker.is_active,
        // email_masked:result.worker.email,
        // cooldown_seconds: env.OTP_RESEND_COOLDOWN_SECONDS
      }
    };
  });
};

// ═══════════════════════════════════════════════════════════════
// STEP 2: VERIFY OTP
// ═══════════════════════════════════════════════════════════════
const verifyWorkerOTP = async (workerId, otp) => {


  

  return await transaction(async (client) => {
    // 1. Find worker in master
    const worker = await workerMasterRepository.findWorkerById(workerId, client);

    console.log(worker.worker_id , "This is my worker");
    if (!worker) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // 2. Check already registered
    const alreadyRegistered = await workerProfileRepository.checkWorkerAlreadyRegistered(workerId, client);
    if (alreadyRegistered) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_ALREADY_REGISTERED, HTTP_STATUS.CONFLICT);
    }

    // 3. Get latest OTP
    const latestOTP = await otpRepositoryworker.findLatestOTPByUserIdWorker(worker.id, client);

    console.log(latestOTP , "This is my Latest OTP");
    if (!latestOTP) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // 4. Check used
    if (latestOTP.is_used) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_ALREADY_USED, HTTP_STATUS.BAD_REQUEST);
    }

    // 5. Check expired
    if (new Date() > new Date(latestOTP.expires_at)) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_EXPIRED, HTTP_STATUS.BAD_REQUEST);
    }

    // 6. Verify OTP with bcrypt
    const isValidOTP = await compareOTP(otp, latestOTP.otp_hash);
    if (!isValidOTP) {
      throw new ErrorHandler(ERROR_MESSAGES.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    // 7. Mark OTP as used
    await otpRepositoryworker.markOTPAsUsedWorker(latestOTP.id, client);

    // 8. Generate short-lived verification token (15 min)
    const verificationToken = generateAccessToken({
      worker_id: worker.worker_id,
      worker_master_id: worker.id,
      email: worker.email,
      purpose: 'worker_registration'
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.OTP_VERIFIED,
      data: {
        verification_token: verificationToken,
        expires_in: "15 Minutes",
        worker: {
           master_worker_id:worker.id,
        worker_id:worker.worker_id,
        full_name:worker.full_name,
        department:worker.department,
        designation:worker.designation,
        status:worker.is_active,
        }
      }
    };
  });
};

// ═══════════════════════════════════════════════════════════════
// STEP 3: COMPLETE REGISTRATION
// ═══════════════════════════════════════════════════════════════
const completeWorkerRegistration = async (workerId, password, verificationToken, idCardImageBuffer) => {
  return await transaction(async (client) => {
    // 1. Verify the short-lived token
    let decoded;

    console.log(typeof(verificationToken),verificationToken,"This is verification token");
    try {
      const jwt = require('../utils/jwt');
      decoded = jwt.verifyAccessToken(verificationToken);
    } catch (err) {
      throw new ErrorHandler(ERROR_MESSAGES.INVALID_VERIFICATION_TOKEN, HTTP_STATUS.UNAUTHORIZED);
    }

    // 2. Verify token worker_id matches request
    if (decoded.worker_id !== workerId) {
      throw new ErrorHandler('Worker ID does not match verification token', HTTP_STATUS.FORBIDDEN);
    }

    // 3. Verify token purpose
    if (decoded.purpose !== 'worker_registration') {
      throw new ErrorHandler('Invalid token purpose', HTTP_STATUS.FORBIDDEN);
    }

    // 4. Find worker in master
    const worker = await workerMasterRepository.findWorkerById(workerId, client);
    if (!worker) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // 5. Check not already registered
    const alreadyRegistered = await workerProfileRepository.checkWorkerAlreadyRegistered(workerId, client);
    if (alreadyRegistered) {
      throw new ErrorHandler(ERROR_MESSAGES.WORKER_ALREADY_REGISTERED, HTTP_STATUS.CONFLICT);
    }


     console.log("Before Upload");
    // 6. Upload ID card to Cloudinary
    const uploadResult = await cloudinaryService.uploadIdCardImage(idCardImageBuffer, workerId);
    console.log("After Upload");

    // 7. Hash password
    const passwordHash = await hashPassword(password);

    // 8. Create user record (email already verified via OTP)
    const user = await userRepository.createUser({
      name: worker.full_name,
      email: worker.email,
      passwordHash,
      role: 'worker',
      isEmailVerified:true
    }, client);

    // 9. Create worker profile (status: under_verification)
    const profile = await workerProfileRepository.createWorkerProfile({
      userId: user.id,
      workerMasterId: worker.id,
      workerId: worker.worker_id,
      zone: worker.zone,
      idCardImageUrl: uploadResult.url,
      verificationStatus: WORKER_STATUS.UNDER_VERIFICATION
    }, client);

    // 10. Generate auth token
    const jwt = require('../utils/jwt');
    const token = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.REGISTRATION_COMPLETE,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_email_verified: user.is_email_verified
        },
        profile: {
          id: profile.id,
          worker_id: profile.worker_id,
          zone: profile.zone,
          verification_status: profile.verification_status,
          id_card_image_url: profile.id_card_image_url
        },
        token,
        expires_in: env.JWT_EXPIRES_IN
      }
    };
  });
};
const getUserProfile = async (userId) => {
  return await transaction(async (client) => {
    // STEP 1: Find user by ID (from JWT token)
    const user = await userRepository.findUserById(userId, client);
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // STEP 2: Check email is verified
    if (!user.is_email_verified) {
      throw new ErrorHandler(
        'Please verify your email before accessing your profile',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // STEP 3: Build clean user object (no sensitive fields)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_email_verified: user.is_email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    // STEP 4: Fetch role-specific profile
    let result = {
      user: userData,
    };

    switch (user.role) {
      case 'student': {
        const studentProfile = await studentProfileRepository.findProfileByUserId(userId, client);
        result.studentProfile = studentProfile || null;
        break;
      }

      case 'faculty': {
        const facultyProfile = await facultyProfileRepository.findProfileByUserId(userId, client);
        result.facultyProfile = facultyProfile || null;
        break;
      }

      case 'worker': {
        const workerProfile = await workerProfileRespoiory.findProfileByUserId(userId, client);
        result.workerProfile = workerProfile || null;
        break;
      }

      case 'admin':
        // Admins don't have a separate profile table
        result.adminProfile = null;
        break;

      default:
        throw new ErrorHandler(
          'Unknown user role',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // STEP 5: Return success response
    return {
      success: true,
      message: 'User profile fetched successfully',
      data: result,
    };
  });
};


// Student Registration
const completeStudentRegistration = async (userId, rollNo, phoneNo) => {
  return await transaction(async (client) => {
    // STEP 3: Find user by ID (from JWT token)
    const user = await userRepository.findUserById(userId, client);
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // STEP 4: Check email is verified
    if (!user.is_email_verified) {
      throw new ErrorHandler(
        'Please verify your email before completing registration',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // STEP 5: Verify role is student
    if (user.role !== 'student') {
      throw new ErrorHandler(
        'Only students can access this resource',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // STEP 6: Check profile does not already exist
    const profileExists = await studentProfileRepository.checkProfileExists(userId, client);
    if (profileExists) {
      throw new ErrorHandler(
        ERROR_MESSAGES.STUDENT_PROFILE_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    // STEP 7: Check roll number uniqueness
    const rollNoExists = await studentProfileRepository.checkRollNoExists(rollNo, client);
    if (rollNoExists) {
      throw new ErrorHandler(
        ERROR_MESSAGES.ROLL_NUMBER_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    // STEP 8: Check phone number uniqueness
    const phoneNoExists = await studentProfileRepository.checkPhoneNoExists(phoneNo, client);
    if (phoneNoExists) {
      throw new ErrorHandler(
        ERROR_MESSAGES.PHONE_NUMBER_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    // STEP 9: Create student profile
    const profile = await studentProfileRepository.createStudentProfile(
      { userId, rollNo, phoneNo },
      client
    );

    // STEP 10: Return success response
    return {
      success: true,
      message: SUCCESS_MESSAGES.STUDENT_PROFILE_CREATED,
      data: {
        id: profile.id,
        user_id: profile.user_id,
        roll_no: profile.roll_no,
        phone_no: profile.phone_no,
        created_at: profile.created_at
      }
    };
  });
};

// Faculty Registration
const completeFacultyRegistration = async (userId, facultyId, facultyType, phoneNo) => {
  return await transaction(async (client) => {
    // STEP 3: Find user by ID (from JWT token)
    const user = await userRepository.findUserById(userId, client);
    if (!user) {
      throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // STEP 4: Check email is verified
    if (!user.is_email_verified) {
      throw new ErrorHandler(
        'Please verify your email before completing registration',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // STEP 5: Verify role is faculty
    if (user.role !== 'faculty') {
      throw new ErrorHandler(
        ERROR_MESSAGES.ONLY_FACULTY_CAN_ACCESS,
        HTTP_STATUS.FORBIDDEN
      );
    }

    // STEP 6: Check faculty profile does not already exist
    const profileExists = await facultyProfileRepository.checkProfileExists(userId, client);
    if (profileExists) {
      throw new ErrorHandler(
        ERROR_MESSAGES.FACULTY_PROFILE_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    // STEP 7: Check faculty_id uniqueness
    const facultyIdExists = await facultyProfileRepository.checkFacultyIdExists(facultyId, client);
    if (facultyIdExists) {
      throw new ErrorHandler(
        ERROR_MESSAGES.FACULTY_ID_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    // STEP 8: Check phone number uniqueness
    const phoneNoExists = await facultyProfileRepository.checkPhoneNoExists(phoneNo, client);
    if (phoneNoExists) {
      throw new ErrorHandler(
        ERROR_MESSAGES.PHONE_NUMBER_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    // STEP 9: Create faculty profile
    const profile = await facultyProfileRepository.createFacultyProfile(
      { userId, facultyId, facultyType, phoneNo },
      client
    );

    // STEP 10: Return success response
    return {
      success: true,
      message: SUCCESS_MESSAGES.FACULTY_PROFILE_CREATED,
      data: {
        id: profile.id,
        user_id: profile.user_id,
        faculty_id: profile.faculty_id,
        faculty_type: profile.faculty_type,
        phone_no: profile.phone_no,
        created_at: profile.created_at
      }
    };
  });
};

const refreshAccessToken = async (refreshToken) => {
  // STEP 1: Verify the refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (error.message === 'Invalid token type') {
      throw new ErrorHandler(ERROR_MESSAGES.REFRESH_TOKEN_WRONG_TYPE, HTTP_STATUS.FORBIDDEN);
    }
    throw new ErrorHandler(ERROR_MESSAGES.REFRESH_TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  // STEP 2: Find user by ID from token
  const user = await userRepository.findUserById(decoded.id);
  if (!user) {
    throw new ErrorHandler(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  // STEP 3: Generate new access token (15 minutes)
  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  // STEP 4: Generate new refresh token (30 days) - ROTATION
  const newRefreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  // STEP 5: Return new tokens
  return {
    success: true,
    message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};




module.exports = {
  registerUser,
  registerStudent,
  loginUser,
  verifyEmail,
   resendOTP,
   sendWorkerOTP, verifyWorkerOTP,
   completeWorkerRegistration,
   completeStudentRegistration,
   completeFacultyRegistration,
   login,
   refreshAccessToken,
   getUserProfile
};






























