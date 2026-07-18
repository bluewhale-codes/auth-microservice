const { HTTP_STATUS } = require('../utils/constants');
const ErrorHandler = require('../utils/errorHandler');

// Indian phone: exactly 10 digits, starts with 6/7/8/9
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

const validateCompleteRegistration = (data) => {
  const errors = [];
  const { roll_no, phone_no } = data;

  // ─── roll_no validation ───
  if (roll_no === undefined || roll_no === null || roll_no === '') {
    errors.push('Roll number is required');
  } else if (typeof roll_no !== 'string') {
    errors.push('Roll number must be a string');
  } else {
    const trimmedRoll = roll_no.trim();
    if (trimmedRoll.length === 0) {
      errors.push('Roll number cannot be empty');
    }
    if (trimmedRoll.length > 50) {
      errors.push('Roll number must not exceed 50 characters');
    }
  }

  // ─── phone_no validation ───
  if (phone_no === undefined || phone_no === null || phone_no === '') {
    errors.push('Phone number is required');
  } else {
    // Convert to string and trim
    const phoneStr = phone_no.toString().trim();
    
    if (!/^\d+$/.test(phoneStr)) {
      errors.push('Phone number must contain only digits');
    } else if (phoneStr.length !== 10) {
      errors.push('Phone number must be exactly 10 digits');
    } else if (!INDIAN_PHONE_REGEX.test(phoneStr)) {
      errors.push('Phone number must start with 6, 7, 8, or 9');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      roll_no: roll_no?.toString().trim().toUpperCase(),
      phone_no: phone_no?.toString().trim()
    }
  };
};

// Middleware wrapper
const validateStudent = (validatorFn) => {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.isValid) {
      return next(new ErrorHandler(result.errors.join('. '), HTTP_STATUS.BAD_REQUEST));
    }
    req.sanitizedData = result.sanitizedData;
    next();
  };
};

module.exports = { validateCompleteRegistration, validateStudent };