const { query } = require('../config/db');

const findWorkerById = async (workerId, client = null) => {
  const sql = `SELECT * FROM worker_master WHERE worker_id = $1 LIMIT 1`;
  const result = client ? await client.query(sql, [workerId]) : await query(sql, [workerId]);
  return result.rows[0] || null;
};

const findWorkerByIdWithEmail = async (workerId, client = null) => {
  const sql = `SELECT * FROM worker_master WHERE worker_id = $1 AND email IS NOT NULL LIMIT 1`;
  const result = client ? await client.query(sql, [workerId]) : await query(sql, [workerId]);
  return result.rows[0] || null;
};

module.exports = { findWorkerById, findWorkerByIdWithEmail };