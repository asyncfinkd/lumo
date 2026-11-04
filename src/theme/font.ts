// Nunito on both platforms (ADR 0002). Text styles are the sizes the design
// uses; components pick one and add a color.

import { Platform, type TextStyle } from 'react-native';

export const fontFamily = {
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Nunito's own line height, about 1.37× its size. A shorter line gets the top
 * of its glyphs clipped on iOS and Android, which shows on big digits.
 */
export const fullLine = (fontSize: number) => Math.ceil(fontSize * 1.37);

/**
 * A big text's design line, made full: `lineHeight` grows to `fullLine` and
 * margins give the extra back, so the box keeps its design height and the
 * glyphs stay where the design has them. iOS puts the extra above the glyphs;
 * Android splits it above and below (CSS half-leading). A symbol Nunito lacks
 * (₾) comes from a fallback font and lands a few points higher, nearer the
 * digits' baseline. `margins` are the style's own, added to.
 */
export function fullLineFit(
  fontSize: number,
  designLine: number,
  margins: { top?: number; bottom?: number } = {},
): TextStyle {
  const extra = fullLine(fontSize) - designLine;
  const above = Platform.OS === 'android' ? Math.ceil(extra / 2) : extra;
  return {
    fontSize,
    lineHeight: fullLine(fontSize),
    marginTop: (margins.top ?? 0) - above,
    marginBottom: (margins.bottom ?? 0) - (extra - above),
  };
}

export const text = {
  /** Left to spend digits. */
  hero: {
    fontFamily: fontFamily.bold,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: -0.8,
    fontVariant: tabular,
  },
  /** Amount in the add sheet. */
  amount: {
    fontFamily: fontFamily.bold,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -1,
    fontVariant: tabular,
  },
  /** Donut total. */
  total: {
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    fontVariant: tabular,
  },
  /** Screen titles: "Insights", "Savings". */
  h1: { fontFamily: fontFamily.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  /** "Good evening, Nika". */
  greeting: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** Card amounts: Came in, Went out. */
  stat: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontVariant: tabular,
  },
  /** Section headers, sheet titles, primary buttons. */
  section: { fontFamily: fontFamily.bold, fontSize: 17 },
  /** List row titles and amounts. */
  rowTitle: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 21 },
  /** Labels, segmented controls, chips, insight text. */
  label: { fontFamily: fontFamily.bold, fontSize: 15 },
  /** Subtitles under titles. */
  subtitle: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 18 },
  /** Secondary row text: "Coffee · 8:40". */
  meta: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 17 },
  /** Small bold notes: "70% spent", "5 days left", percentages. */
  small: { fontFamily: fontFamily.bold, fontSize: 12 },
} as const satisfies Record<string, TextStyle>;

export const tabularNums = tabular;
