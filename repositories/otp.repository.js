const { query } = require('../config/db');

const createOTP = async (otpData, client = null) => {
  const { userId, otpHash, expiresAt } = otpData;
  const sql = `
    INSERT INTO email_otps (user_id, otp_hash, expires_at, is_used, created_at)
    VALUES ($1, $2, $3, false, NOW())
    RETURNING id, user_id, expires_at, is_used, created_at
  `;
  const result = client 
    ? await client.query(sql, [userId, otpHash, expiresAt])
    : await query(sql, [userId, otpHash, expiresAt]);
  return result.rows[0];
};

const findLatestOTPByUserId = async (userId, client = null) => {
  const sql = `
    SELECT id, user_id, otp_hash, expires_at, is_used, created_at
    FROM email_otps WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
  `;
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0] || null;
};

const markOTPAsUsed = async (otpId, client = null) => {
  const sql = `
    UPDATE email_otps SET is_used = true WHERE id = $1
    RETURNING id, user_id, is_used
  `;
  const result = client ? await client.query(sql, [otpId]) : await query(sql, [otpId]);
  return result.rows[0] || null;
};

module.exports = { createOTP, findLatestOTPByUserId, markOTPAsUsed };