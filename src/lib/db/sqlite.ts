import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'nubtang.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');

    initSchema(dbInstance);
  }

  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS processed_slips (
      drive_file_id TEXT PRIMARY KEY,
      account TEXT NOT NULL,
      amount REAL,
      transaction_date TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_processed_slips_status ON processed_slips(status);

    CREATE TABLE IF NOT EXISTS processed_statements (
      file_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      modified_time TEXT NOT NULL,
      md5_checksum TEXT,
      transactions_count INTEGER DEFAULT 0,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function isSlipProcessed(driveFileId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT drive_file_id FROM processed_slips WHERE drive_file_id = ?').get(driveFileId);
  return Boolean(row);
}

export function markSlipProcessed(data: {
  driveFileId: string;
  account: string;
  amount?: number;
  transactionDate?: string;
  status: 'SUCCESS' | 'FAILED' | 'IGNORED_ZERO';
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO processed_slips (drive_file_id, account, amount, transaction_date, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(drive_file_id) DO UPDATE SET
      status = excluded.status,
      amount = excluded.amount,
      transaction_date = excluded.transaction_date
  `);

  stmt.run(
    data.driveFileId,
    data.account,
    data.amount ?? null,
    data.transactionDate ?? null,
    data.status
  );
}

export function isStatementProcessed(fileId: string, modifiedTime?: string): boolean {
  const db = getDb();
  if (!modifiedTime) {
    const row = db.prepare('SELECT file_id FROM processed_statements WHERE file_id = ?').get(fileId);
    return Boolean(row);
  }
  const row = db.prepare('SELECT file_id FROM processed_statements WHERE file_id = ? AND modified_time = ?').get(fileId, modifiedTime);
  return Boolean(row);
}

export function markStatementProcessed(data: {
  fileId: string;
  fileName: string;
  modifiedTime: string;
  md5Checksum?: string;
  transactionsCount?: number;
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO processed_statements (file_id, file_name, modified_time, md5_checksum, transactions_count)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(file_id) DO UPDATE SET
      file_name = excluded.file_name,
      modified_time = excluded.modified_time,
      md5_checksum = excluded.md5_checksum,
      transactions_count = excluded.transactions_count,
      processed_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    data.fileId,
    data.fileName,
    data.modifiedTime,
    data.md5Checksum ?? null,
    data.transactionsCount ?? 0
  );
}

export function getUserByUsername(username: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
    id: string;
    username: string;
    password_hash: string;
    created_at: string;
  } | undefined;
}

export function createUser(id: string, username: string, passwordHash: string) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
  stmt.run(id, username, passwordHash);
}
