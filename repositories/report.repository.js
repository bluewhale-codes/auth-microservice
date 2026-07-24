/**
 * Report Repository Layer
 * 
 * Handles all database operations for issue_reports table.
 * No business logic here — only raw data access.
 * Supports optional transaction client for atomic operations.
 */

const { query } = require('../config/db');

/**
 * Build dynamic WHERE clause and parameters for filtering
 * @param {string} baseWhere - Base WHERE condition (e.g., "reported_by = $1")
 * @param {number} paramIndex - Starting parameter index
 * @param {Object} filters - Filter criteria
 * @returns {Object} { whereClause, params, nextIndex }
 */
const buildFilterConditions = (baseWhere, paramIndex, filters) => {
  const conditions = [baseWhere];
  const params = [];
  let idx = paramIndex;

  if (filters.status) {
    conditions.push(`status = $${idx}`);
    params.push(filters.status);
    idx++;
  }

  if (filters.issue_type) {
    conditions.push(`issue_type = $${idx}`);
    params.push(filters.issue_type);
    idx++;
  }

  const whereClause = conditions.join(' AND ');
  return { whereClause, params, nextIndex: idx };
};

/**
 * Get reports for student or faculty (reports they created)
 */
const getReportsForStudentOrFaculty = async (userId, filters, client = null) => {
  const baseWhere = `reported_by = $1`;
  const { whereClause, params, nextIndex } = buildFilterConditions(baseWhere, 2, filters);

  const sql = `
    SELECT 
      id, reported_by, image_url, audio_url, issue_type, description,
      latitude, longitude, block_id, floor_id, room_id,
      status, assigned_worker_id, assigned_at, resolved_at,
      created_at, updated_at
    FROM issue_reports
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
  `;

  const allParams = [userId, ...params, filters.limit, filters.offset];

  const result = client
    ? await client.query(sql, allParams)
    : await query(sql, allParams);

  return result.rows;
};

/**
 * Get reports for worker (tasks assigned to them)
 */
const getReportsForWorker = async (workerId, filters, client = null) => {
  const baseWhere = `assigned_worker_id = $1`;
  const { whereClause, params, nextIndex } = buildFilterConditions(baseWhere, 2, filters);

  const sql = `
    SELECT 
      id, reported_by, image_url, audio_url, issue_type, description,
      latitude, longitude, block_id, floor_id, room_id,
      status, assigned_worker_id, assigned_at, resolved_at,
      created_at, updated_at
    FROM issue_reports
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
  `;

  const allParams = [workerId, ...params, filters.limit, filters.offset];

  const result = client
    ? await client.query(sql, allParams)
    : await query(sql, allParams);

  return result.rows;
};

/**
 * Count total reports for student or faculty
 */
const countReportsForStudentOrFaculty = async (userId, filters, client = null) => {
  const baseWhere = `reported_by = $1`;
  const { whereClause, params } = buildFilterConditions(baseWhere, 2, filters);

  const sql = `SELECT COUNT(*) AS total FROM issue_reports WHERE ${whereClause}`;
  const allParams = [userId, ...params];

  const result = client
    ? await client.query(sql, allParams)
    : await query(sql, allParams);

  return parseInt(result.rows[0].total, 10);
};

/**
 * Count total reports for worker
 */
const countReportsForWorker = async (workerId, filters, client = null) => {
  const baseWhere = `assigned_worker_id = $1`;
  const { whereClause, params } = buildFilterConditions(baseWhere, 2, filters);

  const sql = `SELECT COUNT(*) AS total FROM issue_reports WHERE ${whereClause}`;
  const allParams = [workerId, ...params];

  const result = client
    ? await client.query(sql, allParams)
    : await query(sql, allParams);

  return parseInt(result.rows[0].total, 10);
};

module.exports = {
  getReportsForStudentOrFaculty,
  getReportsForWorker,
  countReportsForStudentOrFaculty,
  countReportsForWorker,
};