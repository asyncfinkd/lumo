import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Lives in the app's Documents/SQLite (iOS) and filesDir/SQLite (Android), which
// iCloud and Android Auto Backup include (ADR 0001). The change listener lets
// `useLiveQuery` re-render screens when data changes.
// kept.db since the app id became com.asyncfinkd.kept: that is a new install, so data from
// the old Lumo app comes over through a .kept (or .lumo) backup, not this file.
const sqlite = openDatabaseSync('kept.db', { enableChangeListener: true });
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
