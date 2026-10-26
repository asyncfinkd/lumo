import { type ComponentRef, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurTargetView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { AddSheet } from './src/AddSheet';
import { BottomFade, Orbs } from './src/Backdrop';
import { FpsMeter } from './src/FpsMeter';
import { GlassTabBar, type Tab } from './src/GlassTabBar';
import { HomeScreen } from './src/HomeScreen';
import { InsightsScreen } from './src/InsightsScreen';
import { color } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const [tab, setTab] = useState<Tab>('home');
  const [sheet, setSheet] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  // Tapping a tab (also the current one) replays its entrance animations.
  const onTab = (next: Tab) => {
    if (next !== 'home' && next !== 'insights') return;
    setTab(next);
    setRunKey((k) => k + 1);
  };

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.root}>
          <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
            <Orbs />
            <ScrollView key={tab} showsVerticalScrollIndicator={false}>
              {tab === 'home' ? <HomeScreen runKey={runKey} /> : <InsightsScreen runKey={runKey} />}
            </ScrollView>
            <BottomFade />
          </BlurTargetView>

          <GlassTabBar active={tab} onChange={onTab} onAdd={() => setSheet(true)} blurTarget={blurTarget} />
          {sheet && <AddSheet blurTarget={blurTarget} onClosed={() => setSheet(false)} />}
          <FpsMeter />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, overflow: 'hidden' },
});
