import Constants from 'expo-constants';
import { Linking, Pressable, Share, StyleSheet, Text } from 'react-native';

import { UtilityShell } from '@/components/screens/UtilityShell';
import { Studio } from '@/constants/colors';
import { hapticSelection } from '@/lib/haptics';

const PRIVACY_POLICY_URL = 'https://pocktmetronome.github.io/pockt-app/privacy.html';
const SUPPORT_EMAIL = 'pockt.support@gmail.com';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPrivacyShade?: () => void;
};

export function AboutScreen({ visible, onClose, onPrivacyShade }: Props) {
  const version = Constants.expoConfig?.version ?? '12.11.0';
  const build = Constants.expoConfig?.ios?.buildNumber ?? '';

  return (
    <UtilityShell
      visible={visible}
      title="ABOUT"
      lede="POCKT. Find Your Pocket."
      onClose={onClose}>
      <Text style={styles.kicker}>PRODUCT</Text>
      <Text style={styles.body}>
        POCKT is a metronome. One native timing engine. Many ways to feel time. Free. No ads. No
        subscription. No paywall. No required account.
      </Text>
      <Text style={styles.kicker}>PRIVACY</Text>
      <Text style={styles.body}>
        POCKT does not include ad SDKs, subscription SDKs, paywalls, tracking, or third-party
        analytics in this build. Microphone and tuner audio, custom photos, recordings, settings,
        and set lists stay on this device unless you export or share them.
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
        onPress={() => {
          void hapticSelection();
          void Linking.openURL(PRIVACY_POLICY_URL);
        }}
        style={({ pressed }) => [styles.linkItem, pressed && styles.pressed]}>
        <Text style={styles.linkText}>Privacy Policy</Text>
      </Pressable>
      {onPrivacyShade ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Privacy shade"
          onPress={() => {
            void hapticSelection();
            onPrivacyShade();
          }}
          style={({ pressed }) => [styles.linkItem, pressed && styles.pressed]}>
          <Text style={styles.linkText}>Privacy shade</Text>
        </Pressable>
      ) : null}
      <Text style={styles.kicker}>SUPPORT</Text>
      <Text style={styles.body}>{SUPPORT_EMAIL}</Text>
      <Text style={styles.kicker}>TIMING</Text>
      <Text style={styles.body}>
        Clicks are scheduled on a native audio timeline. Internal diagnostics measure scheduler
        behavior. They are not a published speaker-output accuracy claim.
      </Text>
      <Text style={styles.meta}>
        Version {version}
        {build ? `  ·  Build ${build}` : ''}
      </Text>
      <Text style={styles.meta}>© 2026 POCKT</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share POCKT"
        onPress={() => {
          void hapticSelection();
          void Share.share({
            message: 'POCKT — a free metronome with no ads and no subscription. Find Your Pocket.',
          });
        }}
        style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
        <Text style={styles.shareText}>SHARE POCKT</Text>
      </Pressable>
    </UtilityShell>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: 18,
    color: Studio.ivoryMute,
    letterSpacing: 2,
    fontWeight: '800',
  },
  body: {
    marginTop: 8,
    color: Studio.ivoryDim,
    fontSize: 16,
    lineHeight: 22,
  },
  linkItem: {
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    color: Studio.ivory,
    fontSize: 16,
    letterSpacing: 1.2,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  meta: {
    marginTop: 22,
    color: Studio.ivoryMute,
  },
  share: {
    marginTop: 18,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Studio.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    color: Studio.ivory,
    letterSpacing: 2,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
  },
});
