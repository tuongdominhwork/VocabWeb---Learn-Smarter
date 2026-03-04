import { createClient } from '@libsql/client';
import 'dotenv/config';

let client;

export function getDb() {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('TURSO_DATABASE_URL environment variable is required');
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// Helper: run a query that returns rows
export async function query(sql, args = []) {
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result.rows;
}

// Helper: run a query that returns a single row
export async function queryOne(sql, args = []) {
  const rows = await query(sql, args);
  return rows[0] ?? null;
}

// Helper: run an INSERT/UPDATE/DELETE
export async function run(sql, args = []) {
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result;
}

// Helper: run multiple statements in a batch (best-effort transaction)
export async function batch(statements) {
  const db = getDb();
  return db.batch(statements.map(s =>
    typeof s === 'string' ? { sql: s, args: [] } : s
  ));
}

export default { getDb, query, queryOne, run, batch };
