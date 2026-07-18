const { HTTP_STATUS } = require('../utils/constants');
const ErrorHandler = require('../utils/errorHandler');

// Indian phone number regex: exactly 10 digits, starts with 6/7/8/9
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

const validateFacultyRegistration = (data) => {
  const errors = [];
  const { faculty_id, faculty_type, phone_no } = data;

  // ─── faculty_id validation ───
  if (faculty_id === undefined || faculty_id === null || faculty_id === '') {
    errors.push('Faculty ID is required');
  } else if (typeof faculty_id !== 'string') {
    errors.push('Faculty ID must be a string');
  } else {
    const trimmedId = faculty_id.trim();
    if (trimmedId.length === 0) {
      errors.push('Faculty ID cannot be empty');
    }
    if (trimmedId.length > 50) {
      errors.push('Faculty ID must not exceed 50 characters');
    }
  }

  // ─── faculty_type validation ───
  if (faculty_type === undefined || faculty_type === null || faculty_type === '') {
    errors.push('Faculty type is required');
  } else if (typeof faculty_type !== 'string') {
    errors.push('Faculty type must be a string');
  } else {
    const trimmedType = faculty_type.trim().toLowerCase();
    if (trimmedType !== 'teaching' && trimmedType !== 'non_teaching') {
      errors.push('Faculty type must be either "teaching" or "non_teaching"');
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
      faculty_id: faculty_id?.toString().trim().toUpperCase(),
      faculty_type: faculty_type?.toString().trim().toLowerCase(),
      phone_no: phone_no?.toString().trim()
    }
  };
};

// Middleware wrapper
const validateFaculty = (validatorFn) => {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.isValid) {
      return next(new ErrorHandler(result.errors.join('. '), HTTP_STATUS.BAD_REQUEST));
    }
    req.sanitizedData = result.sanitizedData;
    next();
  };
};

module.exports = { validateFacultyRegistration, validateFaculty };