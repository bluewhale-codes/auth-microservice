const { REGEX, ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');
const ErrorHandler = require('../utils/errorHandler');

const validateSendOTP = (data) => {
  const errors = [];
  const { worker_id } = data;

  if (!worker_id || typeof worker_id !== 'string') {
    errors.push('Worker ID is required');
  } else {
    const trimmed = worker_id.trim().toUpperCase();
    if (trimmed.length < 3 || trimmed.length > 20) {
      errors.push('Worker ID must be between 3 and 20 characters');
    }
    if (!/^[A-Z0-9-]+$/.test(trimmed)) {
      errors.push('Worker ID can only contain uppercase letters, numbers, and hyphens');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: { worker_id: worker_id?.trim().toUpperCase() }
  };
};

const validateVerifyOTP = (data) => {
  const errors = [];
  const worker_id = data.worker_id;
  const otp = data.otp?.toString();


  if (!worker_id || typeof worker_id !== 'string') {
    errors.push('Worker ID is required');
  }

  if (!otp || typeof otp !== 'string') {
    errors.push('OTP is required');
  } else if (!REGEX.OTP.test(otp.trim())) {
    errors.push(ERROR_MESSAGES.INVALID_OTP);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      worker_id: worker_id?.trim().toUpperCase(),
      otp: otp?.trim()
    }
  };
};

const validateRegister = (data) => {
  const errors = [];
  const { worker_id, password, verification_token } = data;

  if (!worker_id || typeof worker_id !== 'string') {
    errors.push('Worker ID is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!REGEX.PASSWORD.test(password)) {
      errors.push(ERROR_MESSAGES.INVALID_PASSWORD);
    }
  }

  if (!verification_token || typeof verification_token !== 'string') {
    errors.push('Verification token is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      worker_id: worker_id?.trim().toUpperCase(),
      password,
      verification_token: verification_token?.trim()
    }
  };
};

const validate = (validatorFn) => {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.isValid) {
      return next(new ErrorHandler(result.errors.join('. '), HTTP_STATUS.BAD_REQUEST));
    }
    req.sanitizedData = result.sanitizedData;
    next();
  };
};

module.exports = { validateSendOTP, validateVerifyOTP, validateRegister, validate };