import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { CameraIcon, CloseIcon, ImageIcon, TrashIcon } from '@/components/Icons';
import { Press } from '@/components/Press';
import { Sheet } from '@/components/Sheet';
import { db } from '@/db/client';
import { useProfile } from '@/features/live';
import { Avatar } from '@/features/profile/Avatar';
import { deletePhotoFile, pickPhoto } from '@/features/profile/photo';
import { setAvatarColor, setPhoto } from '@/features/profile/repo';
import {
  avatarColor,
  type AvatarColor,
  categoryColor,
  color,
  fontFamily,
  radius,
  shadow,
  size,
  text,
} from '@/theme';

const COLORS = Object.keys(avatarColor) as AvatarColor[];

// ProfilePhotoSheet: take or choose a photo, remove it, or keep the initial
// on one of six colors.
export default function ProfilePhotoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile();
  // `null` until a color is tapped: tapping one means "keep your initial".
  const [picked, setPicked] = useState<AvatarColor | null>(null);
  if (!profile) return null;

  const shown = picked ?? profile.avatarColor;

  const choose = async (source: 'camera' | 'library') => {
    const photo = await pickPhoto(source);
    if (!photo) return;
    router.push({
      pathname: '/profile-photo-crop',
      params: { uri: photo.uri, width: String(photo.width), height: String(photo.height) },
    });
  };

  const remove = (close: () => void) => {
    deletePhotoFile(profile.photoUri);
    setPhoto(db, null);
    close();
  };

  const done = (close: () => void) => {
    if (picked) {
      setAvatarColor(db, picked);
      deletePhotoFile(profile.photoUri);
      setPhoto(db, null);
    }
    close();
  };

  return (
    <Sheet accessibilityLabel={t('profile.photo.title')} onDismissed={router.back}>
      {(close) => (
        <>
          <View style={styles.header}>
            <View style={styles.spacer} />
            <Text accessibilityRole="header" style={styles.title}>
              {t('profile.photo.title')}
            </Text>
            <Press accessibilityLabel={t('common.close')} onPress={close} style={styles.close}>
              <CloseIcon color={color.muted} />
            </Press>
          </View>

          <View style={styles.preview}>
            <Avatar name={profile.name} tint={shown} size={88} />
          </View>

          <View style={styles.list}>
            <Option
              tile={categoryColor.transport}
              icon={<CameraIcon color={categoryColor.transport.fg} />}
              label={t('profile.photo.take')}
              onPress={() => choose('camera')}
            />
            <Option
              tile={categoryColor.bills}
              icon={<ImageIcon color={categoryColor.bills.fg} />}
              label={t('profile.photo.choose')}
              onPress={() => choose('library')}
            />
            <Option
              tile={{ bg: color.dangerSoft, fg: color.danger }}
              icon={<TrashIcon color={color.danger} />}
              label={t('profile.photo.remove')}
              danger
              onPress={() => remove(close)}
            />
          </View>

          <Text accessibilityRole="header" style={styles.colorsTitle}>
            {t('profile.photo.keepInitial')}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.colors}>
            {COLORS.map((c) => {
              const selected = c === shown;
              return (
                <Press
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t(`profile.photo.colors.${c}`)}
                  onPress={() => setPicked(c)}
                  style={[
                    styles.color,
                    { boxShadow: selected ? shadow.initialPicked : shadow.initialIdle },
                  ]}
                >
                  <Avatar name={profile.name} tint={c} size={48} />
                </Press>
              );
            })}
          </View>

          <Button label={t('profile.photo.done')} onPress={() => done(close)} style={styles.done} />
        </>
      )}
    </Sheet>
  );
}

function Option({
  tile,
  icon,
  label,
  danger = false,
  onPress,
}: {
  tile: { bg: string; fg: string };
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Press accessibilityRole="button" onPress={onPress} style={styles.option}>
      <View style={[styles.tile, { backgroundColor: tile.bg }]}>{icon}</View>
      <Text style={[styles.optionLabel, danger && { color: color.danger }]}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    height: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: { width: size.touch },
  title: { ...text.section, color: color.ink },
  close: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginTop: 14,
    alignSelf: 'center',
    borderRadius: 44,
    boxShadow: shadow.photoPreview,
  },
  list: {
    marginTop: 18,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: color.washSoft,
  },
  option: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { ...text.rowTitle, flex: 1, color: color.ink },
  colorsTitle: {
    ...text.meta,
    marginTop: 20,
    paddingHorizontal: 4,
    fontFamily: fontFamily.extrabold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.muted,
  },
  colors: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  color: { width: 48, height: 48, borderRadius: radius.pill },
  done: { marginTop: 22 },
});
