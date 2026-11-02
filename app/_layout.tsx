import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { P2 } from '@/constants/pockt-2';
import { missingNativeViews } from '@/lib/native-view-registry';

SplashScreen.preventAutoHideAsync();

try {
  SplashScreen.setOptions({
    duration: 0,
    fade: true,
  });
} catch {
  /* Expo Go / web may ignore animation options */
}

void SystemUI.setBackgroundColorAsync(P2.field).catch(() => undefined);

export default function RootLayout() {
  if (Platform.OS === 'ios') {
    const missing = missingNativeViews();
    if (missing.length > 0) {
      return (
        <View style={styles.blocked} testID="native-view-registration-failure">
          <Text style={styles.blockedTitle}>NATIVE VIEW REGISTRATION FAILED</Text>
          {missing.map((name) => (
            <Text key={name} style={styles.blockedLine}>
              {name}
            </Text>
          ))}
        </View>
      );
    }
  }
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: P2.field },
          animation: 'fade',
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: P2.field,
  },
  blocked: {
    flex: 1,
    backgroundColor: '#3A0000',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  blockedTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  blockedLine: {
    color: '#FFD2D2',
    fontSize: 16,
  },
});
