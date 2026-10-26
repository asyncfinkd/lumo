# ADR 0003: Money as integer minor units

- **Status:** Accepted
- **Date:** 2026-10-26
- **Issue:** [#12](https://github.com/asyncfinkd/lumo/issues/12)

## Context

Lumo is about one number people trust: what's left to spend. JavaScript numbers are binary floats, so `0.1 + 0.2 === 0.30000000000000004` and `1.005 * 100 === 100.49999999999999`. Summing hundreds of transactions as floats drifts by a tetri here and there, and a budget app that's off by ₾0.01 loses trust.

v1 has one currency per user, picked from 8 currencies in onboarding ([MVP scope](../mvp-scope.md)). The design shows amounts as `₾1,234.50`.

## Decision

### Storage

- Every amount is an **integer number of minor units** (tetri, cents): `₾754.70` is stored as `75470`.
- SQLite column type `INTEGER`, named `*_minor` (`amount_minor`, `limit_minor`).
- Amounts are **always positive**. Direction comes from the row's `kind` (`income` / `expense`). A balance adjustment ([#6](https://github.com/asyncfinkd/lumo/issues/6)) is stored as income or expense depending on its sign.
- Every money row also stores its **currency code** (`GEL`). In v1 it always equals the profile currency; storing it now keeps a future multi-currency change a data migration, not a guess.
- In TypeScript, amounts are plain `number`s, always integers. `Number.MAX_SAFE_INTEGER` in tetri is about ₾90 trillion, so `bigint` isn't needed.

### Minor units per currency

The number of decimals comes from **ISO 4217**, kept in one table in `domain/money.ts`. All 8 v1 currencies have 2 (GEL, USD, EUR, GBP, TRY, AMD, AZN, UAH). A 0-decimal currency (like JPY) can be added later without touching other code.

### Math

- Add and subtract integers only.
- **Never** convert with `parseFloat(text) * 100`. The keypad already builds a string (`"24.50"`). Parse it by splitting on the decimal point into whole and fraction parts.
- Derived amounts that need division (per-day amount, averages) are **rounded down** (`Math.floor`), so the app never suggests more than you have: ₾85.48 a day shows as **₾85**.
- Percentages for display (`70% spent`) are rounded to the nearest whole number.

### Formatting

One function formats every amount. The v1 style matches the design for every locale:

| Where | Rule | Example |
| --- | --- | --- |
| Transactions, Left to spend | Always 2 decimals | `₾70.00`, `−₾11.50`, `+₾3,800.00` |
| Totals, limits, chips, "left" | Drop `.00` only when the amount is whole | `₾800`, `₾87.60` |

- Symbol first, comma thousands, dot decimal: `₾1,234.50`.
- Expenses use a real minus sign `−` (U+2212), income a `+`, both before the symbol.
- Digits and grouping come from `Intl.NumberFormat('en-US')`. Symbols come from our own table (`₾ $ € £ ₺ ֏ ₼ ₴`), because `Intl` symbol support differs between iOS and Android.
- A Georgian number format comes with the Georgian language ([#20](https://github.com/asyncfinkd/lumo/issues/20)).

### IDs

All rows use **UUID v4** IDs (`expo-crypto` `randomUUID()`), not autoincrement, so a future Import ([#16](https://github.com/asyncfinkd/lumo/issues/16)) can merge without collisions ([ADR 0001](0001-local-only-data.md)).

## Consequences

**Good**
- Totals are exact, always. Left to spend, budgets and Insights agree to the tetri.
- One place (`domain/money.ts`) for parsing, math and formatting, easy to test.

**Costs**
- Every boundary (keypad input, display, import) must convert explicitly. A raw `amount / 100` in UI code is a bug; use the helpers.
- Rows are slightly harder to read in a database viewer (`75470` instead of `754.70`).

## Tests to write (`domain/money.ts`)

- [ ] Parse `"24.50"`, `"24.5"`, `"24"`, `"0.05"`, `"1,234.50"` to minor units
- [ ] Parsing never goes through floats (`"1.005"` is rejected or truncated, never `100`/`101` by accident)
- [ ] Format with and without `.00` per the table above
- [ ] `−` and `+` signs, thousands grouping
- [ ] Per-day amount rounds down
- [ ] Minor units table: 2 for all v1 currencies
