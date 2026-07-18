const { query } = require('../config/db');

const createWorkerProfile = async (profileData, client = null) => {
  const { userId, workerMasterId, workerId, zone, idCardImageUrl, verificationStatus } = profileData;
  const sql = `
    INSERT INTO worker_profiles (user_id, worker_master_id, worker_id, zone, id_card_image_url, verification_status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;
  const result = client
    ? await client.query(sql, [userId, workerMasterId, workerId, zone, idCardImageUrl, verificationStatus])
    : await query(sql, [userId, workerMasterId, workerId, zone, idCardImageUrl, verificationStatus]);
  return result.rows[0];
};

const checkWorkerAlreadyRegistered = async (workerId, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM worker_profiles WHERE worker_id = $1) as exists';
  const result = client ? await client.query(sql, [workerId]) : await query(sql, [workerId]);
  return result.rows[0].exists;
};

module.exports = { createWorkerProfile, checkWorkerAlreadyRegistered };