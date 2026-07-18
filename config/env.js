/**
 * Environment Configuration
 * Centralized environment variable management with validation
 * Never use process.env directly in other files
 */
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

// Validate required environment variables on startup
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

module.exports = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // EMAIL FOR OTP
  FROM_EMAIL:process.env.FROM_EMAIL,

  // Database
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // API
  RESEND_API:process.env.RESEND_API_KEY,

  // Security
  BCRYPT_SALT_ROUNDS: 12,
  OTP_EXPIRY_MINUTES:process.env.OTP_EXPIRY_MINUTES,

  // Allowed roles for registration (whitelist)
  ALLOWED_ROLES: ['student', 'admin', 'faculty','worker'],
  DEFAULT_ROLE: 'student',


   // OTP Settings
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10,
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 30,  // ← NEW
  MAX_OTP_ATTEMPTS: parseInt(process.env.MAX_OTP_ATTEMPTS, 10) || 5,
  MAX_OTP_RESENDS_PER_HOUR: parseInt(process.env.MAX_OTP_RESENDS_PER_HOUR, 10) || 5,  // ← NEW

  // CLOUDINARY CREDENTIAL
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};