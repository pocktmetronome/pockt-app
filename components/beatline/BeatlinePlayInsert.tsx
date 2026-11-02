import { StyleSheet, View } from 'react-native';

type Props = {
  playing: boolean;
};

export function BeatlinePlayInsert({ playing }: Props) {
  return (
    <View style={styles.well}>
      <View style={styles.shade} />
      <View style={styles.ridge} />
      <View pointerEvents="none" style={[styles.glyphLayer, { opacity: playing ? 0 : 1 }]}>
        <View style={styles.playStack}>
          <View style={[styles.playTriangle, styles.playRecess]} />
          <View style={styles.playTriangle} />
          <View style={[styles.playTriangle, styles.playRidge]} />
        </View>
      </View>
      <View pointerEvents="none" style={[styles.glyphLayer, { opacity: playing ? 1 : 0 }]}>
        <View style={styles.pausePair}>
          <View style={styles.pauseStack}>
            <View style={[styles.pauseBar, styles.glyphRecess]} />
            <View style={styles.pauseBar} />
            <View style={[styles.pauseBar, styles.glyphRidge]} />
          </View>
          <View style={styles.pauseStack}>
            <View style={[styles.pauseBar, styles.glyphRecess]} />
            <View style={styles.pauseBar} />
            <View style={[styles.pauseBar, styles.glyphRidge]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    width: '40%',
    height: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 6, 4, 0.12)',
  },
  ridge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(214, 204, 186, 0.12)',
  },
  glyphLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playStack: {
    width: 14,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    marginLeft: 2,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#C2B395',
  },
  playRecess: {
    borderLeftColor: 'rgba(10, 8, 6, 0.55)',
    transform: [{ translateX: 0.7 }, { translateY: 0.8 }],
  },
  playRidge: {
    borderLeftColor: 'rgba(232, 222, 200, 0.28)',
    transform: [{ translateX: -0.5 }, { translateY: -0.6 }],
  },
  pausePair: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
  },
  pauseStack: {
    width: 4,
    height: 13,
  },
  pauseBar: {
    position: 'absolute',
    width: 3.5,
    height: 13,
    borderRadius: 0.8,
    backgroundColor: '#C2B395',
  },
  glyphRecess: {
    backgroundColor: 'rgba(10, 8, 6, 0.5)',
    transform: [{ translateX: 0.6 }, { translateY: 0.7 }],
  },
  glyphRidge: {
    backgroundColor: 'rgba(232, 222, 200, 0.26)',
    transform: [{ translateX: -0.4 }, { translateY: -0.5 }],
  },
});
