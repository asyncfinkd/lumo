// Timing from the design's CSS, so motion matches 1:1. Curves are cubic-bezier
// control points; components turn them into `Easing.bezier(...curve)`.
// Every animation also respects Reduce Motion.

type Curve = readonly [number, number, number, number];

export const curve = {
  /** .rise, sparkline .draw, donut segments */
  rise: [0.22, 1, 0.36, 1],
  /** .fill progress bars */
  fill: [0.34, 1.35, 0.64, 1],
  /** Left to spend digits */
  digit: [0.34, 1.2, 0.64, 1],
  /** .press release */
  press: [0.34, 1.56, 0.64, 1],
  /** Segmented control thumbs, tab bar pill */
  thumb: [0.34, 1.3, 0.64, 1],
  /** Insights bars */
  bar: [0.34, 1.25, 0.64, 1],
  /** Bottom sheets sliding up */
  sheet: [0.32, 1.15, 0.5, 1],
} as const satisfies Record<string, Curve>;

/** Milliseconds. */
export const duration = {
  rise: 900,
  fill: 1000,
  fillDelay: 450,
  digit: 1100,
  digitStagger: 90,
  pressIn: 120,
  pressOut: 500,
  thumb: 450,
  bar: 600,
  donutSegment: 600,
  donutStagger: 70,
  sheet: 700,
  scrim: 500,
  caretBlink: 1100,
  orbDrift: 30000,
} as const;

/** Pressed buttons shrink to this scale. */
export const pressScale = 0.96;
