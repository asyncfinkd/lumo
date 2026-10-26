import { Image, StyleSheet, Text, View } from 'react-native';
import { avatarColor, type AvatarColor, color, fontFamily } from '@/theme';

/** The round avatar: the profile photo, or the first letter of the name on its color. */
export function Avatar({
  name,
  tint,
  photoUri,
  size,
}: {
  name: string;
  tint: AvatarColor;
  photoUri?: string | null;
  size: number;
}) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (photoUri) {
    return <Image source={{ uri: photoUri }} accessible={false} style={round} />;
  }
  return (
    <View style={[styles.initial, round, { backgroundColor: avatarColor[tint] }]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.4) }]}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initial: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fontFamily.extrabold, color: color.ink },
});
