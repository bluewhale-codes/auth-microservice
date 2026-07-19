const { Pool } = require("pg");


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});



const connectToDB = async () =>{
      try {
    const client = await pool.connect();

    console.log("✅ PostgreSQL Connected Successfully");

    client.release();
  } catch (error) {
    console.error("❌ Database Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
}

const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

// 🔑 KEY: Transaction wrapper for atomic operations
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


module.exports = { pool, connectToDB, query, transaction };



