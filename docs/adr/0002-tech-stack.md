# ADR 0002: Tech stack

- **Status:** Accepted
- **Date:** 2026-10-26
- **Issue:** [#11](https://github.com/asyncfinkd/lumo/issues/11)

## Context

- One developer who knows React and React Native, shipping v1 to iOS and Android in 1–2 months ([#7](https://github.com/asyncfinkd/lumo/issues/7)).
- The design leans on motion and glass: rolling digits, sheets, blur, a drawn donut. The [#8](https://github.com/asyncfinkd/lumo/issues/8) spike rebuilt those screens in React Native + Expo, matched the design side by side, and ran at **60 FPS on a real iPhone and Android phone**.
- All data stays on the device ([ADR 0001](0001-local-only-data.md)). Money is integer minor units ([ADR 0003](0003-money-as-minor-units.md)).
- This Mac has no Xcode or Android Studio.

## Decision

| Area | Choice | Why |
| --- | --- | --- |
| Language | **TypeScript**, `strict` | Money and dates need types |
| App framework | **React Native 0.88 + Expo SDK 58** | One codebase, existing skills, proven in the spike |
| Navigation | **Expo Router** (routes in `src/app/`) | File-based tabs, stacks and modal sheets |
| Database | **expo-sqlite + Drizzle ORM** | Typed schema and queries, generated migrations, `useLiveQuery` re-renders screens when data changes |
| UI state | **Zustand** | Only short-lived UI state (open sheet, onboarding answers). Data lives in SQLite, never in a store |
| Animation | **Reanimated 4** + react-native-worklets | Runs on the UI thread; the spike hit 60 FPS |
| Gestures | **Gesture Handler 3** (hook API) | Drag to dismiss sheets |
| Styling | **`StyleSheet` + design tokens** (`src/theme`) | RN 0.88 `boxShadow` and `backgroundImage` take the design's CSS directly. No styling library |
| Icons | **react-native-svg**, paths copied from the design | 1:1 with the design, no icon font |
| Glass | **expo-blur** | No `tint`; the design's own color layer on top. Android content inside `BlurTargetView` |
| Haptics | **expo-haptics** | Numpad and primary buttons |
| Font | **Nunito** on both platforms (`@expo-google-fonts/nunito`) | Same look everywhere, as in the spike |
| i18n | **i18next + react-i18next + expo-localization** | All copy through i18n from day one; Georgian in v1.1 ([#20](https://github.com/asyncfinkd/lumo/issues/20)) |
| IDs | **expo-crypto** `randomUUID()` | UUID v4 ([ADR 0003](0003-money-as-minor-units.md)) |
| Dates | Plain `Date` + helpers in `src/domain/dates.ts` | Payday periods are small; add a library only if it grows |
| Tests | **jest-expo** + React Native Testing Library | Domain logic first (money, left to spend, periods) |
| Lint / format | **ESLint** (`npx expo lint`) + **Prettier** | One style, checked in CI |
| Package manager | **npm** | Already in use, fully supported by Expo |
| Builds | **Expo Go** while developing, **EAS Build** for dev and store builds | No local Xcode or Android Studio needed |

### Folder layout

```
src/
  app/          routes only (Expo Router)
  components/   shared UI: Press, Sheet, Card, Numpad, …
  features/     onboarding/, home/, transactions/, budgets/, insights/, profile/
  domain/       pure logic: money.ts, leftToSpend.ts, dates.ts (no React)
  db/           schema.ts, client.ts, migrations/
  theme/        tokens: color, font, shadow, easing
  i18n/         en.json
```

Rule: `domain/` has no React and no database imports, so it's fully unit-testable.

## Alternatives considered

- **Flutter.** Excellent for custom motion, but nobody on the team knows Dart, and the 1–2 month target leaves no room to learn.
- **Native (Swift + Kotlin).** Best platform feel, but two codebases for one developer.
- **op-sqlite / WatermelonDB.** Faster or sync-oriented, but expo-sqlite is fast enough for one person's data and works in Expo Go. We have no sync ([ADR 0001](0001-local-only-data.md)).
- **SF Pro Rounded on iOS.** More native, but the two platforms would look different. Revisit after v1.

## Consequences

**Good**
- Every library is either in Expo Go or proven in the spike, so day one is `npx create-expo-app` and building screens.
- The spike's components (digit roll, sheet, donut, glass tab bar) can be lifted into `src/components/`.

**Costs**
- Expo SDK upgrades ship breaking changes; we upgrade once per SDK, deliberately, in its own PR.
- When we add a native module outside Expo Go (bank messages, [#9](https://github.com/asyncfinkd/lumo/issues/9)), development moves to an EAS development build.
- Metro's file watcher on this Mac sometimes misses changes; restart with `--clear` when the app looks stale.
