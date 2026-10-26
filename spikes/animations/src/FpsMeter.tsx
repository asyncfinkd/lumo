import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { font } from './theme';

// Measures frames per second on the UI thread (where Reanimated animations run)
// and on the JS thread, plus the worst UI second since the last reset.
// Tap to reset the minimum before measuring an animation.
export function FpsMeter() {
  const [ui, setUi] = useState(0);
  const [js, setJs] = useState(0);
  const [minUi, setMinUi] = useState(0);

  const frames = useSharedValue(0);
  const windowStart = useSharedValue(0);
  const min = useSharedValue(999);

  useFrameCallback((info) => {
    'worklet';
    if (windowStart.value === 0) windowStart.value = info.timestamp;
    frames.value += 1;
    const elapsed = info.timestamp - windowStart.value;
    if (elapsed >= 1000) {
      const fps = Math.round((frames.value * 1000) / elapsed);
      if (fps < min.value) min.value = fps;
      scheduleOnRN(setUi, fps);
      scheduleOnRN(setMinUi, min.value);
      frames.value = 0;
      windowStart.value = info.timestamp;
    }
  });

  const jsFrames = useRef(0);
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    const tick = () => {
      jsFrames.current += 1;
      const now = performance.now();
      if (now - start >= 1000) {
        setJs(Math.round((jsFrames.current * 1000) / (now - start)));
        jsFrames.current = 0;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Reset frame rate minimum"
      onPress={() => {
        min.value = 999;
        setMinUi(0);
      }}
      style={styles.meter}
    >
      <Text style={styles.text}>
        UI {ui} · JS {js} · min {minUi === 999 ? '–' : minUi}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  meter: {
    position: 'absolute',
    top: 54,
    right: 12,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(43,37,34,0.82)',
    justifyContent: 'center',
    zIndex: 100,
  },
  text: { color: '#FFF8F1', fontFamily: font.bold, fontSize: 12, fontVariant: ['tabular-nums'] },
});
