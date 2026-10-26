# ADR 0001: Local-only data

- **Status:** Accepted
- **Date:** 2026-10-26
- **Issue:** [#10](https://github.com/asyncfinkd/lumo/issues/10)

## Context

Lumo holds personal financial data: income, bills, every purchase. The product promise is "Money, but calmer", and part of feeling calm is knowing that your money data isn't sitting on someone else's server.

All v1 features ([MVP scope](../mvp-scope.md)) work with one person's data on one device. Nothing in v1 needs a server to compute or display. We are one developer with a 1–2 month target, so a backend would also mean auth, hosting, security and compliance work we can't afford.

## Decision

**All user data stays on the device. Lumo has no backend, no accounts, and we never receive or store user data.**

- Data lives in a SQLite database on the device.
- The v1 app makes **no network requests**. Fonts and assets are bundled. One currency per user means no exchange rates are needed.
- **No analytics and no third-party crash reporting.** Crash reports come only from App Store Connect and Google Play Console, collected by the OS with the user's consent.
- **"Delete all data"** in Profile wipes the database on the device. There is no copy anywhere else to delete.

### Backup (so a lost phone doesn't mean lost data)

We rely on the platforms' own backups, which belong to the user, not to us:

| Platform | How | Notes |
| --- | --- | --- |
| iOS | The database lives in the app's `Documents` folder, which iCloud (and Finder) backups include | Don't mark the database as excluded from backup |
| Android | [Auto Backup](https://developer.android.com/identity/data/autobackup) to the user's Google Drive | Keep `allowBackup` enabled. Limit is 25 MB per app, far above our needs |

These restore on a new device of the **same platform**. Moving between iOS and Android needs Export / Import ([#16](https://github.com/asyncfinkd/lumo/issues/16)), which is planned after v1.

### Security on the device

- **App lock** (Face ID / fingerprint) is planned after v1 ([#24](https://github.com/asyncfinkd/lumo/issues/24)).
- **Database encryption** (SQLCipher) is deferred. If the key is not in the backup, a restored database can't be opened; if it is, encryption adds little. We'll revisit it together with app lock.

## Consequences

**Good**
- Strong privacy story: App Store "Data Not Collected", Google Play "No data collected"
- Works fully offline, every action is instant
- No server cost, no auth, no breach risk on our side
- Less to build and maintain for a solo developer

**Trade-offs we accept**
- No open banking (TBC, Bank of Georgia APIs need a server). Automatic input can only come from bank messages on the device ([#9](https://github.com/asyncfinkd/lumo/issues/9)).
- No shared budgets (couples, families)
- No sync between devices
- We can't see how people use the app or which crashes are most common beyond what the stores show
- If a user turns off iCloud / Google backup and loses the phone, the data is gone. Export ([#16](https://github.com/asyncfinkd/lumo/issues/16)) is the answer for those users.

**Rules for code**
- Never add a network call, SDK or library that sends data off the device without a new ADR that replaces this one.
- Use UUIDs for IDs so a future Import can merge without duplicates ([ADR 0003](https://github.com/asyncfinkd/lumo/issues/12)).
