import { sparkPath } from '../sparkPath';

const ys = (d: string) =>
  [...d.matchAll(/(?:M|C[^C]*?)\s?([\d.]+) ([\d.]+)(?= C|$)/g)].map((m) => Number(m[2]));

describe('sparkPath', () => {
  it('runs from the bottom left to the top right for a growing total', () => {
    const { d, area, length } = sparkPath([100, 100, 300]);
    expect(d.startsWith('M3 24')).toBe(true);
    expect(d.endsWith('57 6')).toBe(true);
    expect(area).toBe(`${d} L57 30 L3 30 Z`);
    expect(length).toBeGreaterThan(54);
  });

  it('follows the numbers: a flat stretch stays flat', () => {
    const { d } = sparkPath([200, 200, 400]);
    expect(ys(d)).toEqual([24, 15, 15, 6]);
  });

  it('is flat along the bottom with nothing yet', () => {
    const { d } = sparkPath([0, 0]);
    expect(ys(d)).toEqual([24, 24, 24]);
  });

  it('starts from nothing, so money on the first day still rises', () => {
    expect(ys(sparkPath([500, 500, 500]).d)).toEqual([24, 6, 6, 6]);
    expect(ys(sparkPath([]).d)).toEqual([24, 24]);
  });

  it('never overshoots: no control point above the top or below the bottom', () => {
    const { d } = sparkPath([0, 900, 900, 950, 2000, 2000]);
    const numbers = [...d.matchAll(/-?[\d.]+/g)].map((m) => Number(m[0]));
    const yValues = numbers.filter((_, i) => i % 2 === 1);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(24);
  });
});
