const { query, transaction } = require('../config/db');

const findUserByEmail = async (email, client = null) => {
  const sql = `
    SELECT id, name, email, password_hash, role, is_email_verified, created_at, updated_at
    FROM users WHERE email = $1 LIMIT 1
  `;
  const executor = client || query;
  const result = client ? await client.query(sql, [email]) : await query(sql, [email]);
  return result.rows[0] || null;
};

const findUserById = async (id, client = null) => {
  const sql = `
    SELECT id, name, email, role, is_email_verified, created_at, updated_at
    FROM users WHERE id = $1 LIMIT 1
  `;
  const result = client ? await client.query(sql, [id]) : await query(sql, [id]);
  return result.rows[0] || null;
};

const createUser = async (userData, client = null) => {
  const { name, email, passwordHash, role } = userData;
  const isEmailVerified = role === 'worker';
  const values = [
    name,
    email,
    passwordHash,
    role,
    isEmailVerified
  ];

  const sql = `
    INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      is_email_verified,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING
      id,
      name,
      email,
      role,
      is_email_verified,
      created_at,
      updated_at
  `;
  const result = client 
    ? await client.query(sql,values)
    : await query(sql, values);
  return result.rows[0];
};

const updateEmailVerified = async (userId, client = null) => {
  const sql = `
    UPDATE users SET is_email_verified = true, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, email, role, is_email_verified, updated_at
  `;
  const result = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
  return result.rows[0] || null;
};

const checkEmailExists = async (email, client = null) => {
  const sql = 'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists';
  const result = client ? await client.query(sql, [email]) : await query(sql, [email]);
  return result.rows[0].exists;
};

// For login - returns user with password_hash
const findUserByEmailWithPassword = async (email, client = null) => {
  const sql = `
    SELECT id, name, email, password_hash, role, is_email_verified, created_at, updated_at
    FROM users WHERE email = $1 LIMIT 1
  `;
  const result = client ? await client.query(sql, [email]) : await query(sql, [email]);
  return result.rows[0] || null;
};

module.exports = {
  findUserByEmail, findUserById, createUser, 
  updateEmailVerified, checkEmailExists , findUserByEmailWithPassword
};