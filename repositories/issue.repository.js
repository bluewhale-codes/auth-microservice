const pool = require("../config/db");

const createIssueReport = async (client, issueData) => {
  const {
    reported_by,
    image_url,
    audio_url,
    issue_type,
    description,
    latitude,
    longitude,
    block_id,
    floor_id,
    room_id,
    status,
  } = issueData;

  const query = `
    INSERT INTO issue_reports (
      reported_by, image_url, audio_url, issue_type, description,
      latitude, longitude, block_id, floor_id, room_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, issue_type, status, created_at;
  `;

  const values = [
    reported_by, image_url, audio_url, issue_type, description,
    latitude, longitude, block_id, floor_id, room_id, status || "reported",
  ];

  const result = await client.query(query, values);
  return result.rows[0];
};

const findIssueById = async (issueId) => {
  const query = `
    SELECT ir.*, u.name AS reporter_name, u.email AS reporter_email,
           w.name AS assigned_worker_name
    FROM issue_reports ir
    LEFT JOIN users u ON ir.reported_by = u.id
    LEFT JOIN users w ON ir.assigned_worker_id = w.id
    WHERE ir.id = $1;
  `;
  const result = await pool.query(query, [issueId]);
  return result.rows[0] || null;
};

const findIssuesByUser = async (userId, limit = 20, offset = 0) => {
  const query = `
    SELECT ir.id, ir.issue_type, ir.description, ir.status, ir.image_url,
           ir.audio_url, ir.latitude, ir.longitude, ir.block_id, ir.floor_id,
           ir.room_id, ir.assigned_at, ir.resolved_at, ir.created_at,
           ir.updated_at, w.name AS assigned_worker_name
    FROM issue_reports ir
    LEFT JOIN users w ON ir.assigned_worker_id = w.id
    WHERE ir.reported_by = $1
    ORDER BY ir.created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const result = await pool.query(query, [userId, limit, offset]);
  return result.rows;
};

const updateIssueStatus = async (client, issueId, status, assignedWorkerId = null) => {
  const updates = ["status = $2", "updated_at = CURRENT_TIMESTAMP"];
  const values = [issueId, status];
  let paramIndex = 3;

  if (assignedWorkerId) {
    updates.push(`assigned_worker_id = $${paramIndex}`);
    updates.push(`assigned_at = CURRENT_TIMESTAMP`);
    values.push(assignedWorkerId);
    paramIndex++;
  }

  if (status === "resolved") {
    updates.push(`resolved_at = CURRENT_TIMESTAMP`);
  }

  const query = `
    UPDATE issue_reports
    SET ${updates.join(", ")}
    WHERE id = $1
    RETURNING id, status, assigned_worker_id, assigned_at, resolved_at, updated_at;
  `;

  const result = await client.query(query, values);
  return result.rows[0] || null;
};

const checkBlockExists = async (blockId) => {
  const query = `SELECT id, name FROM blocks WHERE id = $1;`;
  const result = await pool.query(query, [blockId]);
  return result.rows[0] || null;
};

const checkFloorExists = async (floorId) => {
  const query = `SELECT id, name, block_id FROM floors WHERE id = $1;`;
  const result = await pool.query(query, [floorId]);
  return result.rows[0] || null;
};

const checkRoomExists = async (roomId) => {
  const query = `SELECT id, name, room_number, floor_id FROM rooms WHERE id = $1;`;
  const result = await pool.query(query, [roomId]);
  return result.rows[0] || null;
};

const validateLocationHierarchy = async (blockId, floorId, roomId) => {
  const query = `
    SELECT r.id AS room_id, r.name AS room_name, r.room_number,
           f.id AS floor_id, f.name AS floor_name,
           b.id AS block_id, b.name AS block_name
    FROM rooms r
    INNER JOIN floors f ON r.floor_id = f.id
    INNER JOIN blocks b ON f.block_id = b.id
    WHERE r.id = $1 AND f.id = $2 AND b.id = $3;
  `;
  const result = await pool.query(query, [roomId, floorId, blockId]);
  return result.rows[0] || null;
};

const countIssuesByUser = async (userId) => {
  const query = `SELECT COUNT(*)::int AS total FROM issue_reports WHERE reported_by = $1;`;
  const result = await pool.query(query, [userId]);
  return result.rows[0].total;
};

module.exports = {
  createIssueReport,
  findIssueById,
  findIssuesByUser,
  updateIssueStatus,
  checkBlockExists,
  checkFloorExists,
  checkRoomExists,
  validateLocationHierarchy,
  countIssuesByUser,
};