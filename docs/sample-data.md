# Sample data

One dataset for the design mocks and the dev seed. Decided in [#5](https://github.com/asyncfinkd/lumo/issues/5). Numbers follow the rules in [#2](https://github.com/asyncfinkd/lumo/issues/2) (left to spend), [#4](https://github.com/asyncfinkd/lumo/issues/4) (bills) and [#6](https://github.com/asyncfinkd/lumo/issues/6) (total balance).

## Profile

| Field | Value |
| --- | --- |
| Name | Nika |
| Currency | GEL (₾) |
| Income | Salary ₾3,800, payday the 5th |
| Period | Oct 5 → Nov 5 |
| Today | Oct 31 (5 days left) |
| Total balance | ₾12,480.50 |

## Bills (reserved at the start of the period)

| Bill | Amount | Category |
| --- | ---: | --- |
| Rent | 800.00 | Home |
| Utilities | 180.00 | Bills |
| Internet | 50.00 | Bills |
| Phone | 30.00 | Bills |
| Gym | 70.00 | Bills |
| Spotify | 20.00 | Bills |
| **Total** | **1,150.00** | |

## Left to spend

```
available   = 3,800 − 1,150      = 2,650.00   ("of ₾2,650")
spending    (non-bill expenses)  = 1,850.30
leftToSpend = 2,650 − 1,850.30   =   799.70   (70% spent)
```

| Home card | Value |
| --- | ---: |
| Came in | 3,800.00 |
| Went out (spending + bills) | 3,000.30 |

## Budgets

| Category | Spent | Limit | Left | State |
| --- | ---: | ---: | ---: | --- |
| Home | 800.00 | 800 | 0.00 | All paid ✓ (rent) |
| Bills | 350.00 | 350 | 0.00 | All paid ✓ |
| Groceries | 812.40 | 900 | 87.60 | Running low |
| Coffee | 248.60 | 320 | 71.40 | |
| Getting around | 286.00 | 400 | 114.00 | |
| Treats | 503.30 | 600 | 96.70 | |
| **Total** | **3,000.30** | **3,370** | **369.70** | 5 of 6 on track |

Spending without bills: 812.40 + 248.60 + 286.00 + 503.30 = **1,850.30**.

## Insights

| Period | Total | By category |
| --- | ---: | --- |
| Month | 3,000.30 | Groceries 812.40, Home 800, Treats 503.30, Bills 350, Getting around 286, Coffee 248.60 |
| Week | 590.25 | Groceries 184.20, Treats 169.65, Coffee 96.40, Bills 70 (Gym), Getting around 70 |

## Recent transactions

| When | Title | Category | Amount |
| --- | --- | --- | ---: |
| Today 8:40 | Coffee Lab | Coffee | −11.50 |
| Today 13:15 | Fresh Market | Groceries | −64.20 |
| Today 18:20 | Bolt | Getting around | −12.40 |
| Yesterday | Gym | Bills (auto, from bill) | −70.00 |
| Oct 5 | Salary | Income (auto, recurring) | +3,800.00 |

## Onboarding (Your month)

```
Income 3,800 − Bills 1,150 = ₾2,650 yours to spend   (about ₾85 a day over 31 days)
```
