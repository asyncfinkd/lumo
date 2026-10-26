import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius, shadow, size, text } from '@/theme';
import { Press } from './Press';

type Props = {
  label: string;
  onPress: () => void;
  /** `primary`: the dark pill ("Continue"). `quiet`: a text button ("Skip for now"). */
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: Props) {
  const primary = variant === 'primary';
  return (
    <Press
      haptic={primary}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[primary ? styles.primary : styles.quiet, disabled && styles.disabled, style]}
    >
      <Text style={primary ? styles.primaryText : styles.quietText}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    boxShadow: shadow.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quiet: { height: size.touch, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  primaryText: { ...text.section, color: color.white },
  quietText: { ...text.label, color: color.muted },
});
