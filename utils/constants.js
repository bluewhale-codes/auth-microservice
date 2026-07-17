/**
 * Application Constants
 * Centralized error messages and validation constants
 */
module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    
  TOO_MANY_REQUESTS: 429,
  
  SERVICE_UNAVAILABLE: 503
  },

  // Validation Messages
  VALIDATION_MESSAGES: {
    NAME_REQUIRED: 'Name is required',
    EMAIL_REQUIRED: 'Email is required',
    PASSWORD_REQUIRED: 'Password is required',
    EMPTY_STRING_NOT_ALLOWED: 'Empty strings are not allowed',
    INVALID_EMAIL: 'Please provide a valid email address',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
    PASSWORD_MISSING_UPPERCASE: 'Password must contain at least one uppercase letter',
    PASSWORD_MISSING_LOWERCASE: 'Password must contain at least one lowercase letter',
    PASSWORD_MISSING_NUMBER: 'Password must contain at least one number',
    PASSWORD_MISSING_SPECIAL: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
    DUPLICATE_EMAIL: 'An account with this email already exists',
    INVALID_ROLE: 'Invalid role specified',
    OTP_REQUIRED: 'OTP is required',
  OTP_NUMBERS_ONLY: 'OTP must contain only numbers',
  OTP_EXACTLY_6_DIGITS: 'OTP must be exactly 6 digits',
  },
  SUCCESS_MESSAGES : {
  USER_REGISTERED: 'Registration successful. Please check your email for OTP verification',
  EMAIL_VERIFIED: 'Email verified successfully',
  PROFILE_COMPLETED: 'Student profile completed successfully'
  },

  // Generic Error Messages (OWASP compliant - never expose internal details)
  ERROR_MESSAGES: {
    GENERIC_ERROR: 'Something went wrong. Please try again later.',
    REGISTRATION_FAILED: 'Registration failed. Please try again.',
    LOGIN_FAILED: 'Invalid credentials',
   
  },

  ERROR_MESSAGES : {
    GENERIC_ERROR: 'Something went wrong. Please try again later.',
    REGISTRATION_FAILED: 'Registration failed. Please try again.',
    LOGIN_FAILED: 'Invalid credentials',
  INVALID_EMAIL: 'Please provide a valid email address',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  INVALID_ROLE: 'Invalid role. Only "student" role is allowed for registration',
  INVALID_OTP: 'Invalid OTP. Please provide a valid 6-digit code',
  INVALID_ROLL_NO: 'Roll number is required and must be a valid format',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'An account with this email already exists',
  EMAIL_NOT_VERIFIED: 'Email not verified. Please verify your email first',
  EMAIL_ALREADY_VERIFIED: 'Email is already verified',
  OTP_NOT_FOUND: 'OTP not found or expired',
  OTP_EXPIRED: 'OTP has expired. Please request a new one',
  OTP_ALREADY_USED: 'OTP has already been used',
  OTP_INVALID: 'Invalid OTP provided',
  OTP_RESEND_COOLDOWN: 'Please wait before requesting a new OTP',
  OTP_MAX_ATTEMPTS: 'Maximum OTP attempts exceeded. Please request a new OTP',
  PROFILE_ALREADY_EXISTS: 'Student profile already exists for this user',
  ROLL_NO_ALREADY_EXISTS: 'This roll number is already registered',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  TOKEN_MISSING: 'Authentication token is missing',
  INTERNAL_ERROR: 'Something went wrong. Please try again later',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again later',
  DB_ERROR: 'Database operation failed'
},

  // Password Validation Regex Patterns
   PASSWORD_PATTERNS: {
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBER: /\d/,
  SPECIAL_CHAR: /[!@#$%^&*(),.?":{}|<>]/,
  MIN_LENGTH: 8,
},

  // Email Validation Regex (RFC 5322 compliant simplified)
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
};