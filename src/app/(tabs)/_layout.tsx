import { type ComponentRef, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BottomFade, Orbs } from '@/components/Backdrop';
import { GlassTabBar, type Tab } from '@/components/GlassTabBar';
import { color } from '@/theme';

const PATHS: Record<Tab, '/' | '/insights' | '/budgets' | '/profile'> = {
  home: '/',
  insights: '/insights',
  budgets: '/budgets',
  profile: '/profile',
};

function activeTab(pathname: string): Tab {
  const match = (Object.keys(PATHS) as Tab[]).find((tab) => PATHS[tab] === pathname);
  return match ?? 'home';
}

// The screens sit inside a BlurTargetView so the glass tab bar can blur them on
// Android. The tab bar is drawn outside it, on top, instead of by <Tabs>.
export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTarget} style={styles.root}>
        <Orbs />
        <Tabs
          tabBar={() => null}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
        >
          <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
          <Tabs.Screen name="insights" options={{ title: t('tabs.insights') }} />
          <Tabs.Screen name="budgets" options={{ title: t('tabs.budgets') }} />
          <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
        </Tabs>
        <BottomFade />
      </BlurTargetView>
      <GlassTabBar
        active={activeTab(pathname)}
        onChange={(tab) => router.navigate(PATHS[tab])}
        onAdd={() => router.push('/add-transaction')}
        blurTarget={blurTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
});
