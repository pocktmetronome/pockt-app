import { StyleSheet, Text, View } from 'react-native';

/**
 * Physical tempo bezel for every alternate face.
 * Visual affordance only. The native perimeter gesture stays authoritative.
 */
export function TempoRingCue({ size }: { size: number }) {
  const ticks = 72;
  const knurl = 48;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="tempo-ring-cue">
      <View
        style={[
          styles.bezel,
          {
            width: size - 4,
            height: size - 4,
            borderRadius: size,
            left: 2,
            top: 2,
            borderWidth: Math.max(7, size * 0.028),
          },
        ]}
      />
      <View
        style={[
          styles.inner,
          {
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: size,
            left: size * 0.05,
            top: size * 0.05,
          },
        ]}
      />
      {Array.from({ length: knurl }, (_, index) => (
        <View
          key={`k${index}`}
          style={[styles.pivot, { transform: [{ rotate: `${(index / knurl) * 360}deg` }] }]}>
          <View style={styles.knurl} />
        </View>
      ))}
      {Array.from({ length: ticks }, (_, index) => {
        const major = index % 6 === 0;
        return (
          <View
            key={index}
            style={[styles.pivot, { transform: [{ rotate: `${(index / ticks) * 360}deg` }] }]}>
            <View style={[styles.tick, { height: major ? 14 : 7, marginTop: major ? 8 : 11 }, major && styles.tickMajor]} />
          </View>
        );
      })}
      <View style={styles.index} />
      <Text style={[styles.cue, { left: size * 0.12, top: size * 0.2 }]} allowFontScaling={false}>
        −
      </Text>
      <Text style={[styles.cue, { right: size * 0.12, top: size * 0.2 }]} allowFontScaling={false}>
        +
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bezel: {
    position: 'absolute',
    borderColor: '#6E5A3A',
    backgroundColor: 'transparent',
  },
  inner: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(214, 196, 160, 0.28)',
  },
  pivot: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    alignItems: 'center',
  },
  knurl: {
    width: 2,
    height: 5,
    marginTop: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(232, 214, 180, 0.45)',
  },
  tick: {
    width: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(214, 206, 190, 0.38)',
  },
  tickMajor: {
    width: 2,
    backgroundColor: 'rgba(232, 214, 180, 0.8)',
  },
  index: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E7D7B8',
  },
  cue: {
    position: 'absolute',
    color: 'rgba(231, 215, 184, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
});
