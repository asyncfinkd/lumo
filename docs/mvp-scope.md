# MVP scope (v1)

Decided in [#1](https://github.com/asyncfinkd/lumo/issues/1). Constraints from [#7](https://github.com/asyncfinkd/lumo/issues/7): solo developer, React Native, **v1 in 1–2 months** on iOS and Android.

## In v1

| Area | What ships |
| --- | --- |
| **Onboarding** | Shortened flow: Welcome → Name → Currency → Income → Bills → Your month |
| **Home** | Left to spend, came in / went out, today's transactions, total balance |
| **Add transaction** | Expense / income, amount, fixed category, date, note |
| **Transaction history** | Full list grouped by day ("See all"), edit and delete |
| **Budgets** | Per-category monthly budgets, edit budget sheet |
| **Insights** | Donut by category, Week and Month views, one human sentence |
| **Profile** | Minimal settings list: name, currency, income, bills, delete all data |
| **Categories** | Fixed set from the design: 6 expense, 4 income |
| **Currency** | One currency per user, picked in onboarding |
| **Language** | English. All copy goes through i18n from day one |
| **Data** | Local only, see [#10](https://github.com/asyncfinkd/lumo/issues/10) |

## Not in v1

| Feature | Why it waits |
| --- | --- |
| Savings jars and the Savings onboarding step ([#14](https://github.com/asyncfinkd/lumo/issues/14)) | Not part of the core loop |
| Permissions onboarding step | Nothing in v1 needs notifications |
| Bill reminders ([#15](https://github.com/asyncfinkd/lumo/issues/15)) | Not part of the core loop |
| Export / Import ([#16](https://github.com/asyncfinkd/lumo/issues/16)) | OS backups (iCloud, Android Auto Backup) cover v1 |
| Loans | No onboarding step designed yet ([#3](https://github.com/asyncfinkd/lumo/issues/3)) |
| Bank messages (SMS / Shortcuts) | Store review risk ([#9](https://github.com/asyncfinkd/lumo/issues/9)) |
| Alternate app icons ([#17](https://github.com/asyncfinkd/lumo/issues/17)) | Nice to have |
| Custom categories ([#18](https://github.com/asyncfinkd/lumo/issues/18)) | Needs its own screen and design |
| Insights "Year" view ([#19](https://github.com/asyncfinkd/lumo/issues/19)) | A new app has no year of data |
| Georgian language ([#20](https://github.com/asyncfinkd/lumo/issues/20)) | Planned for v1.1 |

## Product decisions

- [#2](https://github.com/asyncfinkd/lumo/issues/2) Left to spend = planned income + extra income − bills − spending, payday to payday
- [#4](https://github.com/asyncfinkd/lumo/issues/4) Bills are reserved up front and become transactions on their due day
- [#5](https://github.com/asyncfinkd/lumo/issues/5) One sample dataset for mocks and dev seed: [sample-data.md](sample-data.md)
- [#6](https://github.com/asyncfinkd/lumo/issues/6) Total balance = sum of all transactions; starting balance and fixes are adjustments
