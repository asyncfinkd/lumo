# Spike: animation and blur fidelity

Throwaway prototype for [#8](https://github.com/asyncfinkd/lumo/issues/8). It answers one question: can React Native + Expo match the Budget Tracker design's motion and glass on a real iPhone and a real Android phone? **This code never merges into `main`.**

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · Gesture Handler 3.3 · expo-blur 58

## What's in it

| Design element | Where | How |
| --- | --- | --- |
| "Left to spend" digit roll-up | Home | One 0–9 column per digit, staggered springs (`src/DigitRoll.tsx`) |
| Progress bars growing in | Home, Insights | Width spring from 0 (`Fill` in `App.tsx`) |
| Glass tab bar with sliding pill | Bottom | `BlurView` + spring pill (`src/GlassTabBar.tsx`) |
| Add sheet: spring in, blur scrim, drag to close | `+` button | Reanimated + Gesture Handler v3 (`src/AddSheet.tsx`) |
| Numpad press scale + haptics | Add sheet | `src/Press.tsx` |
| Donut drawing in | Insights | Animated SVG dash offset per segment (`src/Donut.tsx`) |
| Reduce Motion | Everywhere | `useReducedMotion()` skips to the end state |
| Frame rate meter | Top right | UI and JS thread FPS, worst UI second since reset (`src/FpsMeter.tsx`) |

Numbers come from [docs/sample-data.md](../../docs/sample-data.md).

## Run it on your phones

No Xcode or Android Studio needed. Install **Expo Go** from the App Store / Google Play, then:

```bash
cd spikes/animations
npm install
npx expo start --no-dev --minify
```

Scan the QR code (Camera app on iPhone, Expo Go on Android). `--no-dev --minify` runs production JavaScript, so the frame rate is close to a real build.

## How to measure

For each row, tap the meter to reset **min**, then run the animation 3 times ("Replay animations" re-runs Home and Insights).

| Check | iPhone | Android |
| --- | --- | --- |
| Digit roll-up: smooth, min UI ≥ 55 | | |
| Tab switch + pill slide | | |
| Add sheet open / close / drag to close | | |
| Blur behind tab bar and sheet looks like the design | | |
| Numpad: press feel + haptic on every key | | |
| Donut draw-in, Week ↔ Month | | |
| Reduce Motion on: no motion, final states correct | | |

Android blur uses `dimezisBlurViewSdk31Plus`: real blur on Android 12+, a translucent fallback below that.

## Known gaps (fine for a spike)

- Icons in lists are color tiles, not the real category icons.
- Budgets and Profile tabs do nothing.
- On web, react-native-svg logs an error for the animated donut segments. Web is not a target.
