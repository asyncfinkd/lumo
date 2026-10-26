// ProfilePhotoCrop: the photo fills a square area, you zoom and drag it, and
// what's inside the circle becomes the profile photo. Pure, so it's tested.

/** The circle the face goes in (design: 280pt). */
export const CIRCLE = 280;
/** Zoom slider range, as a percent (design: 100–220). */
export const ZOOM_MIN = 100;
export const ZOOM_MAX = 220;
/** The design opens the crop at 130%. */
export const ZOOM_START = 130;

export type Frame = {
  /** Photo size in pixels. */
  width: number;
  height: number;
  /** Side of the square area the photo fills, in points. */
  area: number;
  /** Percent, ZOOM_MIN–ZOOM_MAX. */
  zoom: number;
};

/** Points per photo pixel: the photo covers the area at 100%, then zooms. */
export function scaleOf({ width, height, area, zoom }: Frame): number {
  'worklet';
  return Math.max(area / width, area / height) * (zoom / 100);
}

/** Keeps a drag within what still fills the whole circle. */
export function clampOffset(frame: Frame, x: number, y: number): { x: number; y: number } {
  'worklet';
  const s = scaleOf(frame);
  const maxX = Math.max(0, (frame.width * s - CIRCLE) / 2);
  const maxY = Math.max(0, (frame.height * s - CIRCLE) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
}

/**
 * The square inside the circle, in photo pixels, for a photo centered in the
 * area and moved by (x, y) points.
 */
export function cropRect(
  frame: Frame,
  x: number,
  y: number,
): { originX: number; originY: number; width: number; height: number } {
  const s = scaleOf(frame);
  const offset = clampOffset(frame, x, y);
  const side = Math.min(Math.round(CIRCLE / s), frame.width, frame.height);
  const clamp = (value: number, max: number) => Math.min(Math.max(0, Math.round(value)), max);
  return {
    originX: clamp(frame.width / 2 - (offset.x + CIRCLE / 2) / s, frame.width - side),
    originY: clamp(frame.height / 2 - (offset.y + CIRCLE / 2) / s, frame.height - side),
    width: side,
    height: side,
  };
}
