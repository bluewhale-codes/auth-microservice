const crypto = require('crypto');
const env = require("../config/env");
const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const otpRepositoryworker = require('../repositories/workerOtp.repository');
const workerMasterRepository = require('../repositories/workerMaster.repository');
const workerProfileRepository = require('../repositories/workerProfile.repository');
const worker = require('../repositories/workerMaster.repository');
const {transaction} = require("../config/db")
const { generateAccessToken } = require('../utils/jwt'); // need
const { hashOTP , compareOTP, hashPassword } = require('../utils/password'); // need
const ErrorHandler = require('../utils/errorhandler'); // need
const { HTTP_STATUS, VALIDATION_MESSAGES, ERROR_MESSAGES , SUCCESS_MESSAGES } = require('../utils/constants');
const emailService = require('./email.service');







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
    const otpHash = await hashOTP(otp);
    const expiresAt = getOTPExpiry();

    // 8. Store OTP (using worker_master.id as user_id)
    await otpRepositoryworker.createOTPWorker({ userId: worker.id, otpHash, expiresAt }, client);

    return { worker, otp };
  }).then(async (result) => {
    // Send email AFTER transaction commits
    await emailService.sendWorkerOTPEmail(result.worker.email, result.worker.full_name, result.otp);

    return {
      success: true,
      message: SUCCESS_MESSAGES.OTP_SENT,
      data: {
        worker_id: result.worker.worker_id,
        email_masked: maskEmail(result.worker.email),
        cooldown_seconds: env.OTP_RESEND_COOLDOWN_SECONDS
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
    const verificationToken = generateVerificationToken({
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
        expires_in: "15 minutes",
        worker: {
          worker_id: worker.worker_id,
          full_name: worker.full_name,
          department: worker.department,
          designation: worker.designation,
          zone: worker.zone
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
    try {
      const jwt = require('../utils/jwt');
      decoded = jwt.verifyVerificationToken(verificationToken);
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

    // 6. Upload ID card to Cloudinary
    const uploadResult = await cloudinaryService.uploadIdCardImage(idCardImageBuffer, workerId);

    // 7. Hash password
    const passwordHash = await hashPassword(password);

    // 8. Create user record (email already verified via OTP)
    const user = await userRepository.createUser({
      name: worker.full_name,
      email: worker.email,
      passwordHash,
      role: 'worker',
      isEmailVerified: true
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
    const token = jwt.generateToken({
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

module.exports = { sendWorkerOTP, verifyWorkerOTP, completeWorkerRegistration };

