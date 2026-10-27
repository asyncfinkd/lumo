// Profile → Export (#16): the file Lumo makes, as CSV or as a PDF summary.
// Pure, so it's tested without React; the screen writes and shares the file.

import { addDays, type CalendarDate } from '@/domain/dates';
import { type CurrencyCode, formatMoney } from '@/domain/money';
import { color } from '@/theme';

export type ExportRange = 'month' | 'three' | 'year' | 'all';
export type ExportFormat = 'csv' | 'pdf';

/** First day included, or `null` for everything. Calendar months, like History. */
export function rangeStart(range: ExportRange, today: CalendarDate): CalendarDate | null {
  const [y, m] = today.split('-').map(Number) as [number, number];
  const monthStart = (year: number, month: number) => {
    const d = new Date(Date.UTC(year, month - 1, 1));
    return d.toISOString().slice(0, 10);
  };
  if (range === 'month') return monthStart(y, m);
  if (range === 'three') return monthStart(y, m - 2);
  if (range === 'year') return `${y}-01-01`;
  return null;
}

type Tx = {
  kind: 'expense' | 'income';
  amountMinor: number;
  currency: CurrencyCode;
  categoryId: string | null;
  title: string;
  note: string | null;
  date: CalendarDate;
  occurredAt: string;
  source: 'manual' | 'bill' | 'recurring_income' | 'adjustment';
};

/** Transactions from `start` to `today`, oldest first. */
export function inRange<T extends Tx>(
  transactions: readonly T[],
  range: ExportRange,
  today: CalendarDate,
): T[] {
  const start = rangeStart(range, today);
  const end = addDays(today, 1);
  return transactions
    .filter((t) => (start === null || t.date >= start) && t.date < end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.occurredAt.localeCompare(b.occurredAt));
}

/**
 * One CSV cell. Quotes when needed, and a text cell starting with = + - @ gets
 * a leading ' so a spreadsheet never runs it as a formula.
 */
export function csvCell(value: string | number, text = true): string {
  let s = String(value);
  if (text && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** "-64.20" / "3800.00": a plain signed number spreadsheets can add up. */
export function plainAmount(minor: number, currency: CurrencyCode): string {
  return formatMoney(minor, currency)
    .replace(/[^\d.\-−]/g, '')
    .replace('−', '-');
}

export type ExportData = {
  transactions: readonly Tx[];
  budgets: readonly { categoryId: string; limitMinor: number; currency: CurrencyCode }[];
  bills: readonly {
    name: string;
    amountMinor: number;
    currency: CurrencyCode;
    day: number;
    categoryId: string | null;
    active: boolean;
  }[];
  incomes: readonly { name: string; amountMinor: number; currency: CurrencyCode; day: number }[];
};

/** Column names and words in the app's language. */
export type ExportWords = {
  category: (id: string | null) => string;
  transactions: string;
  budgets: string;
  billsAndIncome: string;
  columns: {
    date: string;
    time: string;
    type: string;
    category: string;
    title: string;
    note: string;
    amount: string;
    currency: string;
    added: string;
    limit: string;
    name: string;
    day: string;
    auto: string;
  };
  kind: { expense: string; income: string; bill: string; salary: string };
  source: Record<Tx['source'], string>;
  yes: string;
  no: string;
};

const time = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * The CSV: transactions, then budgets, then bills and income, each with its
 * own header row. Starts with a BOM so Excel reads Georgian correctly.
 */
export function buildCsv(data: ExportData, w: ExportWords): string {
  const row = (cells: (string | number)[]) => cells.join(',');
  const c = w.columns;
  const lines: string[] = [];

  lines.push(csvCell(w.transactions));
  lines.push(
    row(
      [c.date, c.time, c.type, c.category, c.title, c.note, c.amount, c.currency, c.added].map(
        (x) => csvCell(x),
      ),
    ),
  );
  for (const t of data.transactions) {
    const signed = t.kind === 'expense' ? -t.amountMinor : t.amountMinor;
    lines.push(
      row([
        t.date,
        time(t.occurredAt),
        csvCell(t.kind === 'expense' ? w.kind.expense : w.kind.income),
        csvCell(t.source === 'adjustment' ? '' : w.category(t.categoryId)),
        // Like History: an adjustment is "Balance adjusted", whatever it was saved as.
        csvCell(t.source === 'adjustment' ? w.source.adjustment : t.title),
        csvCell(t.note ?? ''),
        plainAmount(signed, t.currency),
        t.currency,
        csvCell(w.source[t.source]),
      ]),
    );
  }

  lines.push('');
  lines.push(csvCell(w.budgets));
  lines.push(row([c.category, c.limit, c.currency].map((x) => csvCell(x))));
  for (const b of data.budgets) {
    lines.push(
      row([csvCell(w.category(b.categoryId)), plainAmount(b.limitMinor, b.currency), b.currency]),
    );
  }

  lines.push('');
  lines.push(csvCell(w.billsAndIncome));
  lines.push(
    row([c.type, c.name, c.category, c.amount, c.currency, c.day, c.auto].map((x) => csvCell(x))),
  );
  for (const b of data.bills) {
    lines.push(
      row([
        csvCell(w.kind.bill),
        csvCell(b.name),
        csvCell(w.category(b.categoryId)),
        plainAmount(b.amountMinor, b.currency),
        b.currency,
        b.day,
        csvCell(b.active ? w.yes : w.no),
      ]),
    );
  }
  for (const i of data.incomes) {
    lines.push(
      row([
        csvCell(w.kind.salary),
        csvCell(i.name),
        '',
        plainAmount(i.amountMinor, i.currency),
        i.currency,
        i.day,
        csvCell(w.yes),
      ]),
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type PdfWords = ExportWords & {
  title: string;
  /** "October 2026", "Everything". */
  period: string;
  cameIn: string;
  wentOut: string;
  byCategory: string;
  footer: string;
};

/** A tidy, printable summary: totals, spending by category, then every list. */
export function buildHtml(data: ExportData, currency: CurrencyCode, w: PdfWords): string {
  const money = (minor: number) => escapeHtml(formatMoney(minor, currency));
  const counted = data.transactions.filter((t) => t.source !== 'adjustment');
  const cameIn = counted.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amountMinor, 0);
  const wentOut = counted
    .filter((t) => t.kind === 'expense')
    .reduce((s, t) => s + t.amountMinor, 0);

  const byCategory = new Map<string | null, number>();
  for (const t of counted.filter((x) => x.kind === 'expense')) {
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amountMinor);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const c = w.columns;

  const txRows = data.transactions
    .map((t) => {
      const sign = t.kind === 'expense' ? '−' : '+';
      return `<tr><td>${t.date}</td><td>${escapeHtml(
        t.source === 'adjustment' ? w.source.adjustment : t.title,
      )}</td><td>${escapeHtml(t.source === 'adjustment' ? '' : w.category(t.categoryId))}</td><td class="n ${t.kind}">${sign}${money(t.amountMinor)}</td></tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:-apple-system,'Helvetica Neue',sans-serif;color:${color.ink};margin:32px;font-size:12px}
  h1{font-size:24px;margin:0}h2{font-size:15px;margin:24px 0 8px}
  .sub{color:${color.muted};margin-top:4px}
  .tot{display:flex;gap:12px;margin-top:16px}.tot div{flex:1;background:${color.bg};border-radius:12px;padding:12px}
  .tot b{display:block;font-size:18px;margin-top:4px}
  table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid ${color.track};text-align:left}
  th{color:${color.muted};font-weight:600}.n{text-align:right;white-space:nowrap}.income{color:${color.good}}
  .foot{margin-top:24px;color:${color.subtle};font-size:11px}
  </style></head><body>
  <h1>${escapeHtml(w.title)}</h1><div class="sub">${escapeHtml(w.period)}</div>
  <div class="tot"><div>${escapeHtml(w.cameIn)}<b>${money(cameIn)}</b></div><div>${escapeHtml(
    w.wentOut,
  )}<b>${money(wentOut)}</b></div></div>
  <h2>${escapeHtml(w.byCategory)}</h2><table>${categories
    .map(
      ([id, minor]) =>
        `<tr><td>${escapeHtml(w.category(id))}</td><td class="n">${money(minor)}</td></tr>`,
    )
    .join('')}</table>
  <h2>${escapeHtml(w.transactions)}</h2><table><tr><th>${escapeHtml(c.date)}</th><th>${escapeHtml(
    c.title,
  )}</th><th>${escapeHtml(c.category)}</th><th class="n">${escapeHtml(c.amount)}</th></tr>${txRows}</table>
  <h2>${escapeHtml(w.budgets)}</h2><table>${data.budgets
    .map(
      (b) =>
        `<tr><td>${escapeHtml(w.category(b.categoryId))}</td><td class="n">${money(b.limitMinor)}</td></tr>`,
    )
    .join('')}</table>
  <h2>${escapeHtml(w.billsAndIncome)}</h2><table>${[
    ...data.bills.map(
      (b) =>
        `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(w.kind.bill)} · ${b.day}</td><td class="n">${money(
          b.amountMinor,
        )}</td></tr>`,
    ),
    ...data.incomes.map(
      (i) =>
        `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(w.kind.salary)} · ${i.day}</td><td class="n income">+${money(
          i.amountMinor,
        )}</td></tr>`,
    ),
  ].join('')}</table>
  <div class="foot">${escapeHtml(w.footer)}</div>
  </body></html>`;
}
