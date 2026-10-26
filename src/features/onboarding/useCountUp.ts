import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

/**
 * Counts from 0 to `target` (Your month's numbers ticking up), easing out over
 * `duration` ms after `delay`. Jumps straight to the target with Reduce Motion.
 */
export function useCountUp(target: number, duration: number, delay = 0): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    const start = performance.now() + delay;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(Math.round(target * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduceMotion]);

  return reduceMotion ? target : value;
}
