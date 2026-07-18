const { query } = require('../config/db');

const createStudentProfile = async (profileData, client = null) => {
  const { userId, rollNo, phoneNo } = profileData;
  
  const sql = `
    INSERT INTO student_profiles (user_id, roll_no, phone_no, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING id, user_id, roll_no, phone_no, created_at, updated_at
  `;
  
  const result = client
    ? await client.query(sql, [userId, rollNo, phoneNo])
    : await query(sql, [userId, rollNo, phoneNo]);
  return result.rows[0];
};

const findProfileByUserId = async (userId, client = null) => {
  const sql = `
    SELECT id, user_id, roll_no, phone_no, created_at, updated_at
    FROM student_profiles WHERE user_id = $1 LIMIT 1
  `;
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0] || null;
};

const checkProfileExists = async (userId, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM student_profiles WHERE user_id = $1) as exists';
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0].exists;
};

const checkRollNoExists = async (rollNo, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM student_profiles WHERE roll_no = $1) as exists';
  const result = client ? await client.query(sql, [rollNo]) : await query(sql, [rollNo]);
  return result.rows[0].exists;
};

const checkPhoneNoExists = async (phoneNo, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM student_profiles WHERE phone_no = $1) as exists';
  const result = client ? await client.query(sql, [phoneNo]) : await query(sql, [phoneNo]);
  return result.rows[0].exists;
};

module.exports = {
  createStudentProfile,
  findProfileByUserId,
  checkProfileExists,
  checkRollNoExists,
  checkPhoneNoExists
};