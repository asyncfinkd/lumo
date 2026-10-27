// The Lumo backup (.lumo): every row on this phone in one JSON file, so a
// restore picks up exactly where the export left off, on this phone or a new
// one. Pure (no Expo modules), so it's tested against a real SQLite in Jest;
// ./files.ts reads and writes the file itself.

import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Db } from '@/db/types';

export const BACKUP_EXTENSION = 'lumo';
/** Bumped only when an older Lumo couldn't read the file any more. */
export const BACKUP_VERSION = 1;

/** In the order they're restored: rows only point at rows above them. */
const TABLES = {
  categories: schema.categories,
  profile: schema.profile,
  recurringBills: schema.recurringBills,
  incomes: schema.incomes,
  budgets: schema.budgets,
  transactions: schema.transactions,
  skippedOccurrences: schema.skippedOccurrences,
  jars: schema.jars,
  jarEntries: schema.jarEntries,
} as const;

type TableName = keyof typeof TABLES;
type Rows = { [K in TableName]: (typeof TABLES)[K]['$inferSelect'][] };

export type Backup = {
  app: 'lumo';
  version: number;
  exportedAt: string;
  data: Rows;
  /** The profile photo as base64 JPEG; the file path itself means nothing on another phone. */
  photo: string | null;
};

/** What the restore question shows before anything is replaced. */
export type BackupSummary = { name: string; exportedAt: string; transactions: number };

export function buildBackup(db: Db, photo: string | null, now = new Date()): Backup {
  const data = Object.fromEntries(
    Object.entries(TABLES).map(([name, table]) => [name, db.select().from(table).all()]),
  ) as Rows;
  data.profile = data.profile.map((p) => ({ ...p, photoUri: null }));
  return { app: 'lumo', version: BACKUP_VERSION, exportedAt: now.toISOString(), data, photo };
}

export class BackupError extends Error {
  constructor(readonly reason: 'invalid' | 'newer') {
    super(reason);
  }
}

/** Reads a backup file's text; throws a BackupError when it isn't one Lumo can restore. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  if (!raw || typeof raw !== 'object') throw new BackupError('invalid');
  const backup = raw as Partial<Backup>;
  if (backup.app !== 'lumo' || typeof backup.version !== 'number') {
    throw new BackupError('invalid');
  }
  if (backup.version > BACKUP_VERSION) throw new BackupError('newer');
  const data = backup.data as Partial<Rows> | undefined;
  if (!data || typeof data !== 'object') throw new BackupError('invalid');
  for (const name of Object.keys(TABLES) as TableName[]) {
    const rows = data[name];
    if (rows === undefined) {
      data[name] = [];
    } else if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== 'object')) {
      throw new BackupError('invalid');
    }
  }
  if (data.profile!.length !== 1) throw new BackupError('invalid');
  return {
    app: 'lumo',
    version: backup.version,
    exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : '',
    data: data as Rows,
    photo: typeof backup.photo === 'string' ? backup.photo : null,
  };
}

export function summarize(backup: Backup): BackupSummary {
  return {
    name: backup.data.profile[0]!.name,
    exportedAt: backup.exportedAt,
    transactions: backup.data.transactions.length,
  };
}

/** Rows per insert, well under SQLite's limit on bound values. */
const CHUNK = 100;

/**
 * Replaces everything on this phone with the backup, all or nothing: if any
 * row doesn't fit, nothing changes and it throws a BackupError.
 */
export function restoreBackup(db: Db, backup: Backup, photoUri: string | null): void {
  // `WHERE 1`: see deleteAllData, so live queries see the change.
  const all = sql`1`;
  try {
    db.transaction((tx) => {
      for (const table of Object.values(TABLES).reverse()) tx.delete(table).where(all).run();
      for (const [name, table] of Object.entries(TABLES) as [
        TableName,
        (typeof TABLES)[TableName],
      ][]) {
        let rows: Record<string, unknown>[] = backup.data[name];
        if (name === 'profile') rows = rows.map((p) => ({ ...p, photoUri }));
        for (let i = 0; i < rows.length; i += CHUNK) {
          // Each row is checked by the database's own constraints.
          tx.insert(table)
            .values(rows.slice(i, i + CHUNK) as never)
            .run();
        }
      }
    });
  } catch {
    throw new BackupError('invalid');
  }
}
