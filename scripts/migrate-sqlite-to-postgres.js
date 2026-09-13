const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function migrate() {
  const sqlitePath = path.join(process.cwd(), 'data', 'nubtang.db');
  if (!fs.existsSync(sqlitePath)) {
    console.error('SQLite database not found at:', sqlitePath);
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL at:', dbUrl.replace(/:[^:@]+@/, ':****@'));

  const pool = new Pool({
    connectionString: dbUrl,
  });

  const client = await pool.connect();
  console.log('Connected to PostgreSQL successfully.');

  try {
    console.log('Creating PostgreSQL tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS processed_slips (
        drive_file_id VARCHAR(255) PRIMARY KEY,
        account VARCHAR(100) NOT NULL,
        amount NUMERIC(15, 2),
        transaction_date VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_processed_slips_status ON processed_slips(status);
      CREATE INDEX IF NOT EXISTS idx_processed_slips_dedup ON processed_slips(amount, status, created_at);

      CREATE TABLE IF NOT EXISTS processed_statements (
        file_id VARCHAR(255) PRIMARY KEY,
        file_name TEXT NOT NULL,
        modified_time VARCHAR(100) NOT NULL,
        md5_checksum VARCHAR(100),
        transactions_count INTEGER DEFAULT 0,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tables verified/created.');

    const sqlite = new Database(sqlitePath);

    // 1. Migrate users
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`Found ${users.length} users in SQLite.`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4::timestamptz)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password_hash = EXCLUDED.password_hash`,
        [u.id, u.username, u.password_hash, u.created_at || new Date().toISOString()]
      );
    }
    console.log(`Migrated ${users.length} users.`);

    // 2. Migrate processed_statements
    const statements = sqlite.prepare('SELECT * FROM processed_statements').all();
    console.log(`Found ${statements.length} statements in SQLite.`);
    for (const s of statements) {
      await client.query(
        `INSERT INTO processed_statements (file_id, file_name, modified_time, md5_checksum, transactions_count, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
         ON CONFLICT (file_id) DO UPDATE SET
           file_name = EXCLUDED.file_name,
           modified_time = EXCLUDED.modified_time,
           md5_checksum = EXCLUDED.md5_checksum,
           transactions_count = EXCLUDED.transactions_count`,
        [s.file_id, s.file_name, s.modified_time, s.md5_checksum || null, s.transactions_count || 0, s.processed_at || new Date().toISOString()]
      );
    }
    console.log(`Migrated ${statements.length} statements.`);

    // 3. Migrate processed_slips in batches
    const slips = sqlite.prepare('SELECT * FROM processed_slips').all();
    console.log(`Found ${slips.length} processed slips in SQLite.`);

    const BATCH_SIZE = 500;
    for (let i = 0; i < slips.length; i += BATCH_SIZE) {
      const batch = slips.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];

      batch.forEach((row, idx) => {
        const offset = idx * 6;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::timestamptz)`);
        values.push(
          row.drive_file_id,
          row.account || 'UNKNOWN',
          row.amount != null ? row.amount : null,
          row.transaction_date || null,
          row.status || 'SUCCESS',
          row.created_at || new Date().toISOString()
        );
      });

      const sql = `
        INSERT INTO processed_slips (drive_file_id, account, amount, transaction_date, status, created_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (drive_file_id) DO UPDATE SET
          account = EXCLUDED.account,
          amount = EXCLUDED.amount,
          transaction_date = EXCLUDED.transaction_date,
          status = EXCLUDED.status
      `;

      await client.query(sql, values);
      process.stdout.write(`Migrated ${Math.min(i + BATCH_SIZE, slips.length)}/${slips.length} slips...\r`);
    }
    console.log(`\nSuccessfully migrated all ${slips.length} slips!`);

    // Verify row counts in PostgreSQL
    const resUsers = await client.query('SELECT COUNT(*) FROM users');
    const resSlips = await client.query('SELECT COUNT(*) FROM processed_slips');
    const resStm = await client.query('SELECT COUNT(*) FROM processed_statements');

    console.log('\n--- Verification Counts in PostgreSQL ---');
    console.log('Users count:', resUsers.rows[0].count);
    console.log('Processed slips count:', resSlips.rows[0].count);
    console.log('Processed statements count:', resStm.rows[0].count);

  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
