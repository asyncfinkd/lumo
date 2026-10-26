import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { toCalendarDate } from '@/domain/dates';
import { db } from './client';
import { newId } from './id';
import migrations from './migrations/migrations';
import { ensureCategories, hasProfile, seedSampleData } from './seed';

let prepared = false;

// Synchronous and idempotent, so it can run during the render that first sees
// the migrations succeed, before any screen reads the database.
function prepare() {
  if (prepared) return;
  ensureCategories(db);
  // EXPO_PUBLIC_SEED=false starts empty, to try onboarding.
  const seed = process.env.EXPO_PUBLIC_SEED !== 'false';
  if (__DEV__ && seed && !hasProfile(db)) seedSampleData(db, toCalendarDate(new Date()), newId);
  prepared = true;
}

/**
 * Migrates the database on start, adds the fixed categories and, in
 * development only, loads docs/sample-data.md into an empty database (unless
 * EXPO_PUBLIC_SEED=false).
 */
export function useDatabase(): { ready: boolean; error: Error | undefined } {
  const { success, error } = useMigrations(db, migrations);
  if (success) prepare();
  return { ready: success, error };
}
