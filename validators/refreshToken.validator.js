const { HTTP_STATUS } = require('../utils/constants');
const ErrorHandler = require('../utils/errorhandler');

const validateRefreshToken = (data) => {
  const errors = [];
  const { refresh_token } = data;

  // refresh_token validation
  if (!refresh_token || typeof refresh_token !== 'string') {
    errors.push('Refresh token is required');
  } else {
    const trimmed = refresh_token.trim();
    if (trimmed.length === 0) {
      errors.push('Refresh token cannot be empty');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      refresh_token: refresh_token?.toString().trim()
    }
  };
};

// Middleware wrapper
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

module.exports = { validateRefreshToken, validate };