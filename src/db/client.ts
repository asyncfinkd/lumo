import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Lives in the app's Documents/SQLite (iOS) and filesDir/SQLite (Android), which
// iCloud and Android Auto Backup include (ADR 0001). The change listener lets
// `useLiveQuery` re-render screens when data changes.
const sqlite = openDatabaseSync('lumo.db', { enableChangeListener: true });
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
