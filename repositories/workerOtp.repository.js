const { query } = require('../config/db');

const createOTPWorker = async (otpData, client = null) => {
  const { userId, otpHash, expiresAt } = otpData;
  const sql = `
    INSERT INTO worker_email_otps (user_id, otp_hash, expires_at, is_used, created_at)
    VALUES ($1, $2, $3, false, NOW())
    RETURNING id, user_id, expires_at, is_used, created_at
  `;
  const result = client 
    ? await client.query(sql, [userId, otpHash, expiresAt])
    : await query(sql, [userId, otpHash, expiresAt]);
  return result.rows[0];
};

const findLatestOTPByUserIdWorker = async (userId, client = null) => {
  const sql = `
    SELECT id, user_id, otp_hash, expires_at, is_used, created_at
    FROM worker_email_otps WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
  `;
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0] || null;
};

const markOTPAsUsedWorker = async (otpId, client = null) => {
  const sql = `
    UPDATE worker_email_otps SET is_used = true WHERE id = $1
    RETURNING id, user_id, is_used
  `;
  const result = client ? await client.query(sql, [otpId]) : await query(sql, [otpId]);
  return result.rows[0] || null;
};


// NEW: Count OTPs sent in a time window (for resend cooldown & rate limiting)
const countRecentOTPsWorker = async (userId, since, client = null) => {
  const sql = `
    SELECT COUNT(*) as count
    FROM worker_email_otps 
    WHERE user_id = $1 AND created_at > $2
  `;
  
  if (client) {
    const result = await client.query(sql, [userId, since]);
    return parseInt(result.rows[0].count, 10);
  }
  
  const result = await query(sql, [userId, since]);
  return parseInt(result.rows[0].count, 10);
};

// NEW: Count OTP resends in the last hour (for hourly rate limiting)
const countResendsInLastHourWorker = async (userId, client = null) => {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const sql = `
    SELECT COUNT(*) as count
    FROM worker_email_otps 
    WHERE user_id = $1 AND created_at > $2
  `;
  
  if (client) {
    const result = await client.query(sql, [userId, oneHourAgo]);
    return parseInt(result.rows[0].count, 10);
  }
  
  const result = await query(sql, [userId, oneHourAgo]);
  return parseInt(result.rows[0].count, 10);
};

// NEW: Get the most recent OTP creation time (for cooldown calculation)
const getLatestOTPCreatedAtWorker = async (userId, client = null) => {
  const sql = `
    SELECT created_at
    FROM worker_email_otps 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  
  if (client) {
    const result = await client.query(sql, [userId]);
    return result.rows[0]?.created_at || null;
  }
  
  const result = await query(sql, [userId]);
  return result.rows[0]?.created_at || null;
};

module.exports = { createOTPWorker, findLatestOTPByUserIdWorker, markOTPAsUsedWorker ,
      countRecentOTPsWorker,
      countResendsInLastHourWorker,
      getLatestOTPCreatedAtWorker, 
};