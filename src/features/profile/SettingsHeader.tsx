import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { Press } from '@/components/Press';
import { color, shadow, size, space, text } from '@/theme';

/** The top of every Profile page: back, the page name, and an optional action on the right. */
export function SettingsHeader({ title, action }: { title: string; action?: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Press
        accessibilityLabel={t('profile.back')}
        onPress={() => router.back()}
        style={styles.round}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="M14.5 6 8.5 12l6 6"
            stroke={color.ink}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Press>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {action ?? <View style={styles.side} />}
    </View>
  );
}

/** A round 44pt button for the header's right side ("+"). */
export function HeaderButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Press accessibilityLabel={label} onPress={onPress} style={styles.round}>
      {children}
    </Press>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    alignItems: 'center',
  },
  round: {
    width: size.touch,
    height: size.touch,
    borderRadius: size.touch / 2,
    backgroundColor: color.card,
    boxShadow: shadow.back,
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: { width: size.touch },
  title: { ...text.section, flex: 1, textAlign: 'center', color: color.ink },
});
