import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Press } from '@/components/Press';
import { db } from '@/db/client';
import { useProfile } from '@/features/live';
import {
  CIRCLE,
  clampOffset,
  cropRect,
  type Frame,
  scaleOf,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_START,
} from '@/features/profile/crop';
import { deletePhotoFile, savePhoto } from '@/features/profile/photo';
import { usePhotoToast } from '@/features/profile/photoToast';
import { setPhoto } from '@/features/profile/repo';
import { color, radius, shadow, size, text } from '@/theme';

// ProfilePhotoCrop: drag and zoom the photo so the face sits in the circle.
export default function ProfilePhotoCropScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: area } = useWindowDimensions();
  const params = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const profile = useProfile();
  const photo = { width: Number(params.width), height: Number(params.height) };

  const zoom = useSharedValue(ZOOM_START);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const frame = (z: number): Frame => {
    'worklet';
    return { ...photo, area, zoom: z };
  };

  const drag = usePanGesture({
    onBegin: () => {
      'worklet';
      start.set({ x: x.get(), y: y.get() });
    },
    onUpdate: (e) => {
      'worklet';
      const next = clampOffset(
        frame(zoom.get()),
        start.get().x + e.translationX,
        start.get().y + e.translationY,
      );
      x.set(next.x);
      y.set(next.y);
    },
  });

  // The photo covers the square at 100%, centered, then zooms and moves.
  const cover = scaleOf(frame(100));
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: zoom.get() / 100 }],
  }));

  const use = async () => {
    if (saving || !profile) return;
    setSaving(true);
    const uri = await savePhoto(params.uri, cropRect(frame(zoom.get()), x.get(), y.get()));
    deletePhotoFile(profile.photoUri);
    setPhoto(db, uri);
    usePhotoToast.getState().show();
    router.dismissTo('/profile');
  };

  const top = insets.top + 101;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Press onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Press>
        <Text accessibilityRole="header" style={styles.title}>
          {t('profile.crop.title')}
        </Text>
        <View style={styles.side} />
      </View>

      <GestureDetector gesture={drag}>
        <View style={[styles.area, { top, height: area }]}>
          <Animated.Image
            accessibilityLabel={t('profile.crop.photo')}
            source={{ uri: params.uri }}
            style={[
              {
                position: 'absolute',
                width: photo.width * cover,
                height: photo.height * cover,
                left: (area - photo.width * cover) / 2,
                top: (area - photo.height * cover) / 2,
              },
              imageStyle,
            ]}
          />
          <Svg width={area} height={area} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path
              fill={color.cropBg}
              fillOpacity={0.72}
              fillRule="evenodd"
              d={`M0 0H${area}V${area}H0Z M${area / 2 - CIRCLE / 2} ${area / 2}a${CIRCLE / 2} ${CIRCLE / 2} 0 1 0 ${CIRCLE} 0a${CIRCLE / 2} ${CIRCLE / 2} 0 1 0 -${CIRCLE} 0Z`}
            />
            <Circle
              cx={area / 2}
              cy={area / 2}
              r={CIRCLE / 2 - 1}
              fill="none"
              stroke={color.cream}
              strokeOpacity={0.9}
              strokeWidth={2}
            />
          </Svg>
        </View>
      </GestureDetector>

      <Text style={[styles.hint, { top: top + area + 25 }]}>{t('profile.crop.hint')}</Text>

      <View style={[styles.zoomRow, { top: top + area + 69 }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" opacity={0.7} accessible={false}>
          <Rect
            x={7}
            y={7}
            width={10}
            height={10}
            rx={3}
            fill="none"
            stroke={color.cream}
            strokeWidth={2.2}
          />
        </Svg>
        <ZoomSlider
          zoom={zoom}
          label={t('profile.crop.zoom')}
          onZoom={(z) => {
            'worklet';
            const next = clampOffset(frame(z), x.get(), y.get());
            x.set(next.x);
            y.set(next.y);
          }}
        />
        <Svg width={22} height={22} viewBox="0 0 24 24" opacity={0.7} accessible={false}>
          <Rect
            x={3.5}
            y={3.5}
            width={17}
            height={17}
            rx={5}
            fill="none"
            stroke={color.cream}
            strokeWidth={2}
          />
        </Svg>
      </View>

      <Press
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
        disabled={saving}
        haptic
        onPress={use}
        style={[styles.use, { bottom: Math.max(insets.bottom, 34) }]}
      >
        <Text style={styles.useText}>{t('profile.crop.use')}</Text>
      </Press>
    </View>
  );
}

const THUMB = 26;

/** The design's zoom slider: a thin light track and a cream thumb. */
function ZoomSlider({
  zoom,
  label,
  onZoom,
}: {
  zoom: SharedValue<number>;
  label: string;
  onZoom: (zoom: number) => void;
}) {
  const track = useSharedValue(0);
  const [percent, setPercent] = useState(ZOOM_START);

  const toZoom = (px: number) => {
    'worklet';
    const usable = Math.max(1, track.get() - THUMB);
    const t = Math.min(1, Math.max(0, (px - THUMB / 2) / usable));
    return ZOOM_MIN + t * (ZOOM_MAX - ZOOM_MIN);
  };
  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      zoom.set(toZoom(e.x));
      onZoom(zoom.get());
    },
    onUpdate: (e) => {
      'worklet';
      zoom.set(toZoom(e.x));
      onZoom(zoom.get());
    },
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          ((zoom.get() - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * Math.max(0, track.get() - THUMB),
      },
    ],
  }));

  const step = (by: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.get() + by));
    zoom.set(next);
    onZoom(next);
    setPercent(Math.round(next));
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: ZOOM_MIN, max: ZOOM_MAX, now: percent }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 10 : -10)}
        onLayout={(e) => track.set(e.nativeEvent.layout.width)}
        style={styles.slider}
      >
        <View style={styles.sliderTrack} />
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.cropBg },
  header: {
    height: size.touch,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: { width: 88, height: size.touch, paddingHorizontal: 8, justifyContent: 'center' },
  cancelText: { ...text.rowTitle, color: color.cream },
  title: { ...text.section, color: color.cream },
  side: { width: 88 },
  area: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  hint: {
    ...text.subtitle,
    position: 'absolute',
    left: 24,
    right: 24,
    textAlign: 'center',
    color: color.cropHint,
  },
  zoomRow: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  slider: { flex: 1, height: size.touch, justifyContent: 'center' },
  sliderTrack: { height: 6, borderRadius: radius.pill, backgroundColor: color.cropTrack },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: color.cream,
    boxShadow: shadow.cropThumb,
  },
  use: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useText: { ...text.section, color: color.ink },
});
