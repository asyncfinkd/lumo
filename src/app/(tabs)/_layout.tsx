import { Tabs } from 'expo-router';

// Stock tab bar for now; the glass tab bar from the design comes in #36.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
