import { StyleSheet, View } from 'react-native';

/** Original POCKT pitch-meter mark. Flat/sharp bars with a green in-tune center. */
const BARS = [
  { h: 0.42, color: '#C43A28' },
  { h: 0.55, color: '#D86A22' },
  { h: 0.7, color: '#E08A24' },
  { h: 0.86, color: '#E6C44A' },
  { h: 1, color: '#3DDC84' },
  { h: 0.86, color: '#E6C44A' },
  { h: 0.7, color: '#E08A24' },
  { h: 0.55, color: '#D86A22' },
  { h: 0.42, color: '#C43A28' },
] as const;

type Props = {
  width?: number;
  height?: number;
  lit?: boolean;
};

export function TunerGlyph({ width = 28, height = 14, lit = true }: Props) {
  const gap = Math.max(1, width * 0.045);
  const barW = (width - gap * (BARS.length - 1)) / BARS.length;
  return (
    <View style={[styles.row, { width, height }]} accessibilityElementsHidden importantForAccessibility="no">
      {BARS.map((bar, index) => (
        <View
          key={index}
          style={{
            width: barW,
            height: height * bar.h,
            borderRadius: barW,
            backgroundColor: bar.color,
            opacity: lit ? (index === 4 ? 1 : 0.88) : 0.42,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});
