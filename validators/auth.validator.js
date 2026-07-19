/**
 * Auth Validator
 * Independent, reusable validation logic for authentication
 * Separated from controllers following Single Responsibility Principle
 */
const {
  VALIDATION_MESSAGES,
  ERROR_MESSAGES,
  PASSWORD_PATTERNS,
  EMAIL_REGEX,
} = require('../utils/constants');
const env = require('../config/env');

/**
 * Validate registration input
 * @param {Object} data - Request body { name, email, password, role }
 * @returns {Promise<string[]>} - Array of error messages (empty if valid)
 */
const validateRegistration = async (data) => {
  const errors = [];
  const errorCode=[];
  const { name, email, password, role } = data;

  // 1. Name Required
  if (name === undefined || name === null) {
    errors.push(VALIDATION_MESSAGES.NAME_REQUIRED);
    errorCode.push("NAME_REQUIRED");
    return {
       errorCode,
       errors
    } // Return early for missing required fields
  }

  // 2. Email Required
  if (email === undefined || email === null) {
    errors.push(VALIDATION_MESSAGES.EMAIL_REQUIRED);
     errorCode.push("EMAIL_REQUIRED");
    return errors;
  }

  // 3. Password Required
  if (password === undefined || password === null) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_REQUIRED);
     errorCode.push("PASS_REQUIRED");
    return errors;
  }

  // 4. Empty Strings Check (after confirming fields exist)
  if (typeof name === 'string' && name.trim().length === 0) {
    errors.push(`${VALIDATION_MESSAGES.NAME_REQUIRED}. ${VALIDATION_MESSAGES.EMPTY_STRING_NOT_ALLOWED}`);
    errorCode.push("EMPTY_STRING_NAME");
  }

  if (typeof email === 'string' && email.trim().length === 0) {
    errors.push(`${VALIDATION_MESSAGES.EMAIL_REQUIRED}. ${VALIDATION_MESSAGES.EMPTY_STRING_NOT_ALLOWED}`);
    errorCode.push("EMPTY_STRING_EMAIL");
  }

  if (typeof password === 'string' && password.trim().length === 0) {
    errors.push(`${VALIDATION_MESSAGES.PASSWORD_REQUIRED}. ${VALIDATION_MESSAGES.EMPTY_STRING_NOT_ALLOWED}`);
    errorCode.push("EMPTY_STRING_PASS");
  }
  console.log(EMAIL_REGEX.test("vishalshakya@gmail.com"));

  // 5. Invalid Email Format
  if (typeof email === 'string' && email.trim().length > 0 && !EMAIL_REGEX.test(email.trim())) {
    errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
    errorCode.push("INVALID_EMAIL");
  }

  // 6. Password Length Check
  if (typeof password === 'string' && password.length < PASSWORD_PATTERNS.MIN_LENGTH) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_TOO_SHORT);
    errorCode.push("EMPTY_STRING");
  }

  // 7. Password Missing Uppercase
  if (typeof password === 'string' && !PASSWORD_PATTERNS.UPPERCASE.test(password)) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_MISSING_UPPERCASE);
    errorCode.push("PASS_MISSING_UPPERCASE");

  }

  // 8. Password Missing Lowercase
  if (typeof password === 'string' && !PASSWORD_PATTERNS.LOWERCASE.test(password)) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_MISSING_LOWERCASE);
    errorCode.push("PASS_MISSING_LOWERCASE");
  }

  // 9. Password Missing Number
  if (typeof password === 'string' && !PASSWORD_PATTERNS.NUMBER.test(password)) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_MISSING_NUMBER);
    errorCode.push("PASS_MISSING_NUMBER");
  }

  // 10. Password Missing Special Character
  if (typeof password === 'string' && !PASSWORD_PATTERNS.SPECIAL_CHAR.test(password)) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_MISSING_SPECIAL);
    errorCode.push("PASS_MISSING_SPECIAL");
  }

  // 11. Invalid Role (if provided)
  if (role !== undefined && !env.ALLOWED_ROLES.includes(role)) {
    errors.push(VALIDATION_MESSAGES.INVALID_ROLE);
    errorCode.push("INVALID_ROLE");
  }

  return {
    errorCode,
    errors
  };
};

/**
 * Validate login input
 * @param {Object} data - Request body { email, password }
 * @returns {Promise<string[]>} - Array of error messages (empty if valid)
 */
const validateLogin = async (data) => {
  const errors = [];
  const { email, password } = data;

  if (!email || (typeof email === 'string' && email.trim().length === 0)) {
    errors.push(VALIDATION_MESSAGES.EMAIL_REQUIRED);
  }

  if (!password || (typeof password === 'string' && password.trim().length === 0)) {
    errors.push(VALIDATION_MESSAGES.PASSWORD_REQUIRED);
  }

  if (email && typeof email === 'string' && email.trim().length > 0 && !EMAIL_REGEX.test(email.trim())) {
    errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
  }

  return errors;
};

/**
 * Sanitize registration input
 * Trims strings and normalizes email to lowercase
 * @param {Object} data - Raw request body
 * @returns {Object} - Sanitized data
 */
const sanitizeRegistrationInput = (data) => {
  return {
    name: typeof data.name === 'string' ? data.name.trim() : data.name,
    email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email,
    password: data.password, // Never trim password - spaces might be intentional
    role: data.role || env.DEFAULT_ROLE,
  };
};





/* ─────────────────────────────────────────────────────────────
   REUSABLE HELPER FUNCTIONS
   ───────────────────────────────────────────────────────────── */

/**
 * Validates email format using project-wide regex.
 * @param {string} email - Email string to validate
 * @returns {boolean} True if valid email format
 */
const isValidEmailFormat = (email) => EMAIL_REGEX.test(email);

/**
 * Validates that a string contains only numeric characters.
 * @param {string} value - String to check
 * @returns {boolean} True if string is numeric only
 */
const isNumericOnly = (value) => /^\d+$/.test(value);

/**
 * Validates that a string is exactly the specified length.
 * @param {string} value - String to check
 * @param {number} length - Expected exact length
 * @returns {boolean} True if length matches exactly
 */
const isExactLength = (value, length) => value.length === length;

/**
 * Checks if value is a non-empty string after trimming.
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a non-empty string
 */
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;


/* ─────────────────────────────────────────────────────────────
   EMAIL VERIFICATION VALIDATOR (NEW)
   ───────────────────────────────────────────────────────────── */
/**
 * Validate email verification input
 * @param {Object} data - Request body { email, otp }
 * @returns {Promise<string[]>} - Array of error messages (empty if valid)
 */
const validateVerifyEmail = async (data) => {
  const errors = [];
  const errorCode = [];
  const { email, otp } = data;


  // 1. Email Required
  if (email === undefined || email === null) {
    errors.push(VALIDATION_MESSAGES.EMAIL_REQUIRED);
    errorCode.push("EMAIL_REQUIRED");

    return {
    errors,
    errorCode
  } 
  }

  // 2. OTP Required
  if (otp === undefined || otp === null) {
    errors.push(VALIDATION_MESSAGES.OTP_REQUIRED);
    errorCode.push("OTP_REQUIRED");
    return {
    errors,
    errorCode
  } 
  }

  // Convert to string for uniform validation (handles number inputs like 43534523)
  const emailStr = typeof email === 'string' ? email : String(email);
  const otpStr = typeof otp === 'string' ? otp : String(otp);

  // 3. Empty Strings Check
  if (emailStr.trim().length === 0) {
    errors.push(`${VALIDATION_MESSAGES.EMAIL_REQUIRED}. ${VALIDATION_MESSAGES.EMPTY_STRING_NOT_ALLOWED}`);
     errorCode.push("EMPTY_STRING_EMAIL");
  }

  if (otpStr.trim().length === 0) {
    errors.push(`${VALIDATION_MESSAGES.OTP_REQUIRED}. ${VALIDATION_MESSAGES.EMPTY_STRING_NOT_ALLOWED}`);
    errorCode.push("EMPTY_STRING_OTP")
  }

  // 4. Invalid Email Format
  if (emailStr.trim().length > 0 && !isValidEmailFormat(emailStr.trim())) {
    errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
    errorCode.push("INVALID_EMAIL")
  }

  // 5. OTP must contain only numbers
  if (otpStr.trim().length > 0 && !isNumericOnly(otpStr.trim())) {
    errors.push(VALIDATION_MESSAGES.OTP_NUMBERS_ONLY);
    errorCode.push("OTP_MUST_CONTAIN_NUMBER")
  }

  // 6. OTP must be exactly 6 digits
  if (otpStr.trim().length > 0 && isNumericOnly(otpStr.trim()) && !isExactLength(otpStr.trim(), 6)) {
    errors.push(VALIDATION_MESSAGES.OTP_EXACTLY_6_DIGITS);
    errorCode.push("EXACTLY_SIX_DIGIT_OTP")
  }

  return {
    errors,
    errorCode
  } 
};

/* ─────────────────────────────────────────────────────────────
   SANITIZATION HELPERS
   ───────────────────────────────────────────────────────────── */

/**
 * Sanitize email verification input
 * Trims email and OTP, normalizes email to lowercase
 * @param {Object} data - Raw request body
 * @returns {Object} - Sanitized data
 */
const sanitizeVerifyEmailInput = (data) => {
  const email = data.email !== undefined && data.email !== null ? String(data.email).trim().toLowerCase() : data.email;
  const otp = data.otp !== undefined && data.otp !== null ? String(data.otp).trim() : data.otp;

  return { email, otp };
};

// NEW: Validate resend OTP request
const validateResendOTP = (data) => {
  const errors = [];
  const { email } = data;

  // Email validation (only email needed for resend)
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      errors.push(ERROR_MESSAGES.INVALID_EMAIL);
    }
    if (normalizedEmail.length > 255) {
      errors.push('Email must not exceed 255 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      email: email?.toLowerCase().trim()
    }
  };
};

const sanitizeResendOTP = (data) => {
  const email = data.email !== undefined && data.email !== null ? String(data.email).trim().toLowerCase() : data.email;

  return { email };
};



module.exports = {
  validateRegistration,
  validateLogin,
  sanitizeRegistrationInput,
  validateVerifyEmail,sanitizeVerifyEmailInput,
  validateResendOTP,
  sanitizeResendOTP
};