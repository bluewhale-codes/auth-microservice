const rateLimit = require('express-rate-limit');
const { HTTP_STATUS } = require('../utils/constants');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }
});

module.exports = { authLimiter };