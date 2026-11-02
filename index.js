import * as SplashScreen from 'expo-splash-screen';
import 'expo-router/entry';

const reveal = () => {
  SplashScreen.hideAsync().catch(() => undefined);
};
reveal();
setTimeout(reveal, 0);
