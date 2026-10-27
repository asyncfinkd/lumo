// The Came in / Went out trend line's shape from real numbers. Pure, so it's
// tested without React or SVG.

/** The design's line sits in a 60×30 box, 3 in from the sides, 6 from top and bottom. */
const LEFT = 3;
const RIGHT = 57;
const TOP = 6;
const BOTTOM = 24;

export type SparkPath = {
  /** The line, smoothed with a cubic between each pair of points. */
  d: string;
  /** Its length, for drawing it in with a dash offset. */
  length: number;
  /** The same line closed down to the bottom, for the fill under it. */
  area: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A running total, one value per day, as a line: it starts from nothing on the
 * left (before the period's first day) and ends at the latest total on the
 * right, the largest at the top. All zero (nothing yet) is flat along the
 * bottom. Smoothed without overshooting, so it never dips or rises past a
 * real number.
 */
export function sparkPath(values: readonly number[]): SparkPath {
  const series = [0, ...values];
  if (series.length < 2) series.push(0);
  const max = Math.max(0, ...series);
  const step = (RIGHT - LEFT) / (series.length - 1);
  const points = series.map((v, i) => ({
    x: LEFT + i * step,
    y: max > 0 ? BOTTOM - (Math.max(0, v) / max) * (BOTTOM - TOP) : BOTTOM,
  }));
  const tangents = monotoneTangents(
    points.map((p) => p.y),
    step,
  );

  let d = `M${round(points[0]!.x)} ${round(points[0]!.y)}`;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c1 = { x: a.x + step / 3, y: a.y + (tangents[i - 1]! * step) / 3 };
    const c2 = { x: b.x - step / 3, y: b.y - (tangents[i]! * step) / 3 };
    d += ` C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(b.x)} ${round(b.y)}`;
    length += cubicLength(a, c1, c2, b);
  }
  return {
    d,
    length: round(length),
    area: `${d} L${RIGHT} 30 L${LEFT} 30 Z`,
  };
}

/**
 * Slopes at each point for a monotone cubic (Fritsch–Carlson, as d3's
 * curveMonotoneX): flat where the total doesn't change, never past a point.
 */
function monotoneTangents(ys: readonly number[], step: number): number[] {
  const slopes = ys.slice(1).map((y, i) => (y - ys[i]!) / step);
  return ys.map((_, i) => {
    if (i === 0) return slopes[0]!;
    if (i === ys.length - 1) return slopes[i - 1]!;
    const s0 = slopes[i - 1]!;
    const s1 = slopes[i]!;
    if (s0 * s1 <= 0) return 0;
    return (
      (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), Math.abs(s0 + s1) / 4)
    );
  });
}

type Point = { x: number; y: number };

/** Close enough for a dash offset: the curve as 12 straight pieces. */
function cubicLength(p0: Point, p1: Point, p2: Point, p3: Point): number {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    const next = {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
    length += Math.hypot(next.x - prev.x, next.y - prev.y);
    prev = next;
  }
  return length;
}
