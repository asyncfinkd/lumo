import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Any synchronous Drizzle SQLite database with our schema: expo-sqlite in the
 * app, better-sqlite3 in tests. Write helpers take one, so tests run them on
 * the real migrations.
 */
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
