const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { JWT_CONFIG } = require('./constants');

// ─── Access Token (15 minutes) ───
const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '15m',
    issuer: JWT_CONFIG.ISSUER,
    algorithm: JWT_CONFIG.ALGORITHM
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: JWT_CONFIG.ISSUER,
    algorithms: [JWT_CONFIG.ALGORITHM]
  });
};

// ─── Verification Token (15 minutes - for worker OTP flow) ───
const generateVerificationToken = (payload) => {
  return jwt.sign(payload, env.JWT_VERIFICATION_SECRET, {
    expiresIn: env.JWT_VERIFICATION_EXPIRES_IN || '15m',
    issuer: JWT_CONFIG.ISSUER,
    algorithm: JWT_CONFIG.ALGORITHM
  });
};

const verifyVerificationToken = (token) => {
  return jwt.verify(token, env.JWT_VERIFICATION_SECRET, {
    issuer: JWT_CONFIG.ISSUER,
    algorithms: [JWT_CONFIG.ALGORITHM]
  });
};

// ─── Registration Token (24 hours - for incomplete profile) ───
const generateRegistrationToken = (payload) => {
  return jwt.sign(
    { ...payload, purpose: 'profile_completion' },
    env.JWT_SECRET,
    {
      expiresIn: '24h',
      issuer: JWT_CONFIG.ISSUER,
      algorithm: JWT_CONFIG.ALGORITHM
    }
  );
};

const verifyRegistrationToken = (token) => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: JWT_CONFIG.ISSUER,
    algorithms: [JWT_CONFIG.ALGORITHM]
  });
  
  if (decoded.purpose !== 'profile_completion') {
    throw new Error('Invalid token purpose');
  }
  
  return decoded;
};

// ─── Refresh Token (30 days) ───
const generateRefreshToken = (payload) => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: JWT_CONFIG.ISSUER,
      algorithm: JWT_CONFIG.ALGORITHM
    }
  );
};

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: JWT_CONFIG.ISSUER,
    algorithms: [JWT_CONFIG.ALGORITHM]
  });
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return decoded;
};

module.exports = {
  generateToken,
  verifyToken,
  generateVerificationToken,
  verifyVerificationToken,
  generateRegistrationToken,
  verifyRegistrationToken,
  generateRefreshToken,
  verifyRefreshToken
};