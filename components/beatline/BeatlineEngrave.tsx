import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

type Props = {
  text: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'label' | 'tempo';
  tight?: boolean;
};

export function BeatlineEngrave({ text, style, tone = 'label', tight = false }: Props) {
  const face = tone === 'tempo' ? (tight ? styles.tempoTight : styles.tempo) : styles.label;
  const fit = tone === 'tempo' || text.length > 7;
  return (
    <View pointerEvents="none" style={[styles.well, style]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={fit}
        minimumFontScale={0.72}
        style={[face, styles.recess]}>
        {text}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={fit}
        minimumFontScale={0.72}
        style={[face, styles.ridge]}>
        {text}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={fit}
        minimumFontScale={0.72}
        style={[face, styles.ink]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  tempo: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.6,
    textAlign: 'center',
  },
  tempoTight: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  recess: {
    position: 'absolute',
    color: 'rgba(12, 9, 7, 0.38)',
    transform: [{ translateX: 0.4 }, { translateY: 0.5 }],
  },
  ridge: {
    position: 'absolute',
    color: 'rgba(214, 204, 186, 0.14)',
    transform: [{ translateX: -0.35 }, { translateY: -0.4 }],
  },
  ink: {
    color: '#9A9082',
  } satisfies TextStyle,
});
