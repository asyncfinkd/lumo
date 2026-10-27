/**
 * @jest-environment node
 */
// The upgrade path: someone's phone holds data from an older version, the app
// updates, and the new migrations run on top of it. For every version the app
// has shipped, this builds a database at that version, fills it the way that
// version stored things, runs every later migration and checks nothing was
// lost or broken.
//
// The fixture uses only the first schema's columns. If a future migration drops
// or renames one of them, these tests fail on purpose: that migration needs to
// carry the data over, and this fixture needs a version-specific insert.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { totalBalance } from '@/domain/balance';
import { allTransactions } from '@/features/transactions/repo';
import { getProfile } from '@/features/profile/repo';
import { CATEGORY_ROWS } from '../categories';
import * as schema from '../schema';
import { ensureCategories } from '../seed';

const MIGRATIONS = path.join(__dirname, '..', 'migrations');
const journal = JSON.parse(
  fs.readFileSync(path.join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'),
) as { entries: { tag: string }[] };
const VERSIONS = journal.entries.length;

const folders: string[] = [];
afterAll(() => {
  for (const dir of folders) fs.rmSync(dir, { recursive: true, force: true });
});

/** A migrations folder with only the first `count` migrations, as an older app had. */
function migrationsUpTo(count: number): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-migrations-'));
  folders.push(dir);
  fs.mkdirSync(path.join(dir, 'meta'));
  const entries = journal.entries.slice(0, count);
  fs.writeFileSync(
    path.join(dir, 'meta', '_journal.json'),
    JSON.stringify({ ...journal, entries }),
  );
  for (const { tag } of entries) {
    fs.copyFileSync(path.join(MIGRATIONS, `${tag}.sql`), path.join(dir, `${tag}.sql`));
  }
  return dir;
}

/** A phone's database, with foreign keys on as in src/db/client.ts. */
function openPhone() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

type Phone = ReturnType<typeof openPhone>;

function upgrade({ db }: Phone, count: number) {
  migrate(db, { migrationsFolder: migrationsUpTo(count) });
}

/**
 * What someone had entered: profile, salary, bills, a budget and every kind of
 * transaction. Categories are written the way that version's app wrote them.
 */
function fillAsOldVersion({ sqlite }: Phone) {
  // From 0003 on, the app saves each category with its icon and color.
  const columns = sqlite.pragma('table_info(categories)') as { name: string }[];
  if (columns.some((c) => c.name === 'icon')) {
    const category = sqlite.prepare(
      'INSERT INTO categories (id, kind, name, sort_order, icon, color) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const c of CATEGORY_ROWS) category.run(c.id, c.kind, c.name, c.sortOrder, c.icon, c.color);
  } else {
    const category = sqlite.prepare(
      'INSERT INTO categories (id, kind, name, sort_order) VALUES (?, ?, ?, ?)',
    );
    for (const c of CATEGORY_ROWS) category.run(c.id, c.kind, c.name, c.sortOrder);
  }

  sqlite
    .prepare(
      "INSERT INTO profile (id, name, currency, payday, onboarded_at) VALUES ('me', 'Nika', 'GEL', 26, '2026-10-01T09:00:00.000Z')",
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO incomes (id, name, amount_minor, currency, day) VALUES ('salary', 'Salary', 380000, 'GEL', 26)",
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO recurring_bills (id, name, amount_minor, currency, day, category_id, active)
       VALUES ('rent', 'Rent', 80000, 'GEL', 1, 'home', 1), ('phone', 'Phone', 3000, 'GEL', 20, 'bills', 0)`,
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO budgets (id, category_id, limit_minor, currency, nudge_at_minor) VALUES ('b1', 'groceries', 90000, 'GEL', 72000)",
    )
    .run();

  const tx = sqlite.prepare(
    `INSERT INTO transactions (id, kind, amount_minor, currency, category_id, title, note, date, occurred_at, source, recurring_id)
     VALUES (?, ?, ?, 'GEL', ?, ?, ?, ?, ?, ?, ?)`,
  );
  tx.run(
    'start',
    'income',
    1200000,
    null,
    'Balance adjusted',
    null,
    '2026-10-01',
    '2026-10-01T09:00:00.000Z',
    'adjustment',
    null,
  );
  tx.run(
    'market',
    'expense',
    6420,
    'groceries',
    'Fresh Market',
    'Weekly groceries',
    '2026-10-27',
    '2026-10-27T13:15:00.000Z',
    'manual',
    null,
  );
  tx.run(
    'rent-oct',
    'expense',
    80000,
    'home',
    'Rent',
    null,
    '2026-10-01',
    '2026-10-01T09:00:00.000Z',
    'bill',
    'rent',
  );
  tx.run(
    'salary-oct',
    'income',
    380000,
    'salary',
    'Salary',
    null,
    '2026-10-26',
    '2026-10-26T10:00:00.000Z',
    'recurring_income',
    'salary',
  );
}

const TABLES = ['categories', 'profile', 'incomes', 'recurring_bills', 'budgets', 'transactions'];

function counts({ sqlite }: Phone) {
  return Object.fromEntries(
    TABLES.map((t) => [
      t,
      (sqlite.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n,
    ]),
  );
}

function expectHealthy({ sqlite }: Phone) {
  expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok');
  expect(sqlite.pragma('foreign_key_check')).toEqual([]);
}

/** Everything the fixture put in, read back through the app's own schema and queries. */
function expectDataKept(phone: Phone) {
  const { db } = phone;
  const me = getProfile(db);
  expect(me).toMatchObject({ name: 'Nika', currency: 'GEL', payday: 26 });
  // Columns added later get their defaults.
  expect(me).toMatchObject({ avatarColor: 'butter', photoUri: null, reminders: true });

  const rows = allTransactions(db).all();
  expect(rows.map((r) => r.id).sort()).toEqual(['market', 'rent-oct', 'salary-oct', 'start']);
  expect(totalBalance(rows)).toBe(1200000 - 6420 - 80000 + 380000);
  expect(rows.find((r) => r.id === 'market')).toMatchObject({
    title: 'Fresh Market',
    note: 'Weekly groceries',
    categoryId: 'groceries',
    amountMinor: 6420,
  });
  expect(rows.find((r) => r.id === 'rent-oct')).toMatchObject({
    source: 'bill',
    recurringId: 'rent',
  });

  const bills = db.select().from(schema.recurringBills).all();
  expect(bills.map((b) => [b.id, b.categoryId, b.active]).sort()).toEqual([
    ['phone', 'bills', false],
    ['rent', 'home', true],
  ]);
  expect(db.select().from(schema.budgets).all()).toMatchObject([
    { categoryId: 'groceries', limitMinor: 90000, nudgeAtMinor: 72000 },
  ]);

  // Default categories got their look (0003), and the app doesn't add them twice.
  const coffee = db
    .select()
    .from(schema.categories)
    .all()
    .find((c) => c.id === 'coffee');
  expect(coffee).toMatchObject({ icon: 'coffee', color: 'latte', renamed: false });
  ensureCategories(db);
  expect(counts(phone).categories).toBe(CATEGORY_ROWS.length);
}

describe('upgrading a phone', () => {
  it(`has migrations to test (${VERSIONS})`, () => {
    expect(VERSIONS).toBeGreaterThan(1);
  });

  it('keeps data from the first version through every update, one at a time', () => {
    const phone = openPhone();
    upgrade(phone, 1);
    fillAsOldVersion(phone);
    const before = counts(phone);

    for (let version = 2; version <= VERSIONS; version++) {
      upgrade(phone, version);
      expect(counts(phone)).toEqual(before);
      expectHealthy(phone);
    }
    expectDataKept(phone);
  });

  // Someone who installed at any version and skipped straight to the latest.
  it.each(Array.from({ length: VERSIONS - 1 }, (_, i) => i + 1))(
    'upgrades a database from version %i straight to the latest',
    (start) => {
      const phone = openPhone();
      upgrade(phone, start);
      fillAsOldVersion(phone);
      const before = counts(phone);

      upgrade(phone, VERSIONS);
      expect(counts(phone)).toEqual(before);
      expectHealthy(phone);
      expectDataKept(phone);
    },
  );

  it('running the migrations again on an up-to-date phone changes nothing', () => {
    const phone = openPhone();
    upgrade(phone, 1);
    fillAsOldVersion(phone);
    upgrade(phone, VERSIONS);
    upgrade(phone, VERSIONS);
    expectHealthy(phone);
    expectDataKept(phone);
  });
});
