// Tests only: an in-memory SQLite (better-sqlite3 in Node) with the real
// migrations and the fixed categories. Never import this from app code.
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { ensureCategories } from './seed';

export function openTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  ensureCategories(db);
  return db;
}
