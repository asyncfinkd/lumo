import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { seedSampleData } from '@/db/seed';
import { openTestDb } from '@/db/testing';
import {
  type Backup,
  BackupError,
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  restoreBackup,
  summarize,
} from '../backup';

let n = 0;
const newId = () => `id-${++n}`;

function filledDb() {
  const db = openTestDb();
  seedSampleData(db, '2026-10-27', newId);
  db.update(schema.profile).set({ photoUri: 'file:///old/photo.jpg', hideAmounts: true }).run();
  db.delete(schema.categories).where(eq(schema.categories.id, 'refund')).run();
  return db;
}

const everything = (db: ReturnType<typeof openTestDb>) => ({
  profile: db.select().from(schema.profile).all(),
  categories: db.select().from(schema.categories).all(),
  transactions: db.select().from(schema.transactions).all(),
  budgets: db.select().from(schema.budgets).all(),
  bills: db.select().from(schema.recurringBills).all(),
  incomes: db.select().from(schema.incomes).all(),
  skipped: db.select().from(schema.skippedOccurrences).all(),
});

describe('Lumo backup', () => {
  it('restores exactly what was exported, on a phone with other data', () => {
    const source = filledDb();
    const file = JSON.stringify(buildBackup(source, 'cGhvdG8='));

    const target = openTestDb();
    seedSampleData(target, '2026-01-10', newId);
    restoreBackup(target, parseBackup(file), 'file:///new/photo.jpg');

    const before = everything(source);
    const after = everything(target);
    expect(after.transactions.length).toBeGreaterThan(10);
    expect(after).toEqual({
      ...before,
      profile: [{ ...before.profile[0], photoUri: 'file:///new/photo.jpg' }],
    });
    // A category deleted before the export stays deleted.
    expect(after.categories.some((c) => c.id === 'refund')).toBe(false);
  });

  it('keeps the photo apart from its path on this phone', () => {
    const backup = buildBackup(filledDb(), 'cGhvdG8=');
    expect(backup.photo).toBe('cGhvdG8=');
    expect(backup.data.profile[0]!.photoUri).toBeNull();
    expect(backup.version).toBe(BACKUP_VERSION);
  });

  it('sums up who and how much before replacing anything', () => {
    const backup = parseBackup(
      JSON.stringify(buildBackup(filledDb(), null, new Date('2026-10-27T10:00:00Z'))),
    );
    expect(summarize(backup)).toEqual({
      name: backup.data.profile[0]!.name,
      exportedAt: '2026-10-27T10:00:00.000Z',
      transactions: backup.data.transactions.length,
    });
  });

  it('turns away files that are not a Lumo backup', () => {
    const reason = (text: string) => {
      try {
        parseBackup(text);
        return 'ok';
      } catch (e) {
        return (e as BackupError).reason;
      }
    };
    expect(reason('Date,Time,Type\n')).toBe('invalid');
    expect(reason('{"app":"other","version":1}')).toBe('invalid');
    expect(reason('{"app":"lumo","version":1,"data":{"profile":[]}}')).toBe('invalid');
    expect(reason('{"app":"lumo","version":99,"data":{}}')).toBe('newer');
  });

  it('changes nothing when a row does not fit', () => {
    const db = filledDb();
    const before = everything(db);
    const backup = buildBackup(db, null);
    const broken: Backup = {
      ...backup,
      data: {
        ...backup.data,
        transactions: [{ ...backup.data.transactions[0]!, amountMinor: -5 }],
      },
    };
    expect(() => restoreBackup(db, broken, null)).toThrow(BackupError);
    expect(everything(db)).toEqual(before);
  });
});
