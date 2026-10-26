import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Stock tab bar for now; the glass tab bar from the design comes in #36.
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
      <Tabs.Screen name="budgets" options={{ title: t('tabs.budgets') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
