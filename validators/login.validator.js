const { REGEX, HTTP_STATUS } = require('../utils/constants');
const ErrorHandler = require('../utils/errorhandler');

const validateLogin = (data) => {
  const errors = [];
  const { email, password } = data;

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const normalizedEmail = email.toLowerCase().trim();
    if (!REGEX.EMAIL.test(normalizedEmail)) {
      errors.push('Please provide a valid email address');
    }
    if (normalizedEmail.length > 255) {
      errors.push('Email must not exceed 255 characters');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.length === 0) {
    errors.push('Password cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      email: email?.toLowerCase().trim(),
      password
    }
  };
};

// Middleware wrapper
const validateLoginData = (validatorFn) => {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.isValid) {
      return next(new ErrorHandler(result.errors.join('. '), HTTP_STATUS.BAD_REQUEST));
    }
    req.sanitizedData = result.sanitizedData;
    next();
  };
};

module.exports = { validateLogin, validateLoginData };