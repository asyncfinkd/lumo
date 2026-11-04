import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { showToast } from '@/components/Toast';
import i18n from '@/i18n';
import { color } from '@/theme';

/** OBHome: "All set. You've got this 🌞" rising above the tab bar once onboarding is done. */
export function showWelcomeToast(): void {
  showToast({
    tone: 'good',
    message: i18n.t('home.welcomeToast'),
    icon: <Sun />,
    // .toast waits 1.2s for Home to come in.
    delay: 1200,
    duration: 4500,
  });
}

function Sun() {
  return (
    <View style={styles.sun}>
      <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={4} fill={color.orbButter} />
        <Path
          d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
          stroke={color.insightIcon}
          strokeWidth={1.9}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.insight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
