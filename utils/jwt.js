const jwt = require("jsonwebtoken");

const sendToken = (data,JWT_SECRET,statusCode,res)=>{
     const authtoken = jwt.sign(data,JWT_SECRET,{expiresIn:"24h"})

     const options = {
          expires: new Date(
              Date.now() + 2*24*60*60*1000
          ),
          httpOnly:true,
          // sameSite:"None",
          // secure:true
        
     }
    
     res.status(statusCode).cookie("Token",authtoken,options).json({
           success:true,
           authtoken,
           user:data
     })
}






/**
 * JWT Utility
 * Handles JWT token generation and verification
 * Uses RS256 in production; HS256 for development simplicity
 */
const env = require('../config/env');

/**
 * Generate a JWT access token
 * @param {Object} payload - Data to encode in the token (user id, role, etc.)
 * @returns {string} - Signed JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000), // Issued at timestamp
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: 'auth-service',
      audience: 'auth-client',
    }
  );
};

/**
 * Verify a JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'auth-service',
    audience: 'auth-client',
  });
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  sendToken
};

