import { CIRCLE, clampOffset, cropRect, scaleOf } from '../crop';

// A 4000 × 3000 landscape photo in a 400pt square, as on a phone.
const frame = { width: 4000, height: 3000, area: 400, zoom: 100 };

describe('scaleOf', () => {
  it('covers the square at 100%, then zooms', () => {
    expect(scaleOf(frame)).toBeCloseTo(400 / 3000);
    expect(scaleOf({ ...frame, zoom: 200 })).toBeCloseTo((400 / 3000) * 2);
  });
});

describe('cropRect', () => {
  it('takes the centered square under the circle', () => {
    const s = 400 / 3000;
    const side = Math.round(CIRCLE / s); // 2100 px
    expect(cropRect(frame, 0, 0)).toEqual({
      originX: (4000 - side) / 2,
      originY: (3000 - side) / 2,
      width: side,
      height: side,
    });
  });

  it('follows the drag: moving the photo right shows more of its left side', () => {
    const centered = cropRect(frame, 0, 0);
    const moved = cropRect(frame, 40, 0);
    expect(moved.originX).toBeLessThan(centered.originX);
    expect(moved.originY).toBe(centered.originY);
  });

  it('gets smaller when zoomed in', () => {
    expect(cropRect({ ...frame, zoom: 200 }, 0, 0).width).toBe(
      Math.round(cropRect(frame, 0, 0).width / 2),
    );
  });

  it('never leaves the photo', () => {
    const rect = cropRect(frame, 10_000, -10_000);
    expect(rect.originX).toBeGreaterThanOrEqual(0);
    expect(rect.originY + rect.height).toBeLessThanOrEqual(3000);
  });
});

describe('clampOffset', () => {
  it('keeps the circle filled', () => {
    // At 100% the photo is 533 × 400pt: 126pt of room sideways, 60pt up and down.
    const { x, y } = clampOffset(frame, 500, 500);
    expect(x).toBeCloseTo((4000 * (400 / 3000) - CIRCLE) / 2);
    expect(y).toBeCloseTo((400 - CIRCLE) / 2);
  });
});
