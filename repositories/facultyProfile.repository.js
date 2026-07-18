
const { query } = require('../config/db');

const createFacultyProfile = async (profileData, client = null) => {
  const { userId, facultyId, facultyType, phoneNo } = profileData;
  
  const sql = `
    INSERT INTO faculty_profiles (user_id, faculty_id, faculty_type, phone_no, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, user_id, faculty_id, faculty_type, phone_no, created_at, updated_at
  `;
  
  const result = client
    ? await client.query(sql, [userId, facultyId, facultyType, phoneNo])
    : await query(sql, [userId, facultyId, facultyType, phoneNo]);
  return result.rows[0];
};

const findProfileByUserId = async (userId, client = null) => {
  const sql = `
    SELECT id, user_id, faculty_id, faculty_type, phone_no, created_at, updated_at
    FROM faculty_profiles WHERE user_id = $1 LIMIT 1
  `;
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0] || null;
};

const checkProfileExists = async (userId, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM faculty_profiles WHERE user_id = $1) as exists';
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0].exists;
};

const checkFacultyIdExists = async (facultyId, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM faculty_profiles WHERE faculty_id = $1) as exists';
  const result = client ? await client.query(sql, [facultyId]) : await query(sql, [facultyId]);
  return result.rows[0].exists;
};

const checkPhoneNoExists = async (phoneNo, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM faculty_profiles WHERE phone_no = $1) as exists';
  const result = client ? await client.query(sql, [phoneNo]) : await query(sql, [phoneNo]);
  return result.rows[0].exists;
};

module.exports = {
  createFacultyProfile,
  findProfileByUserId,
  checkProfileExists,
  checkFacultyIdExists,
  checkPhoneNoExists
};