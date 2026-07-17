/**
 * Password Utility
 * Handles password hashing and comparison using bcryptjs
 * Uses 12 salt rounds for production-grade security
 */
const bcrypt = require('bcryptjs');
// const env = require('../config/env');

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
//   const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(otp,salt);
};

const compareOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
  hashOTP,
  compareOTP
};