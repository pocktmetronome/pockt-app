import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Dark machined well shared by every interchangeable face. */
export function FaceWell({ size, children }: { size: number; children?: ReactNode }) {
  return (
    <View style={{ width: size, height: size }} pointerEvents="box-none">
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#242628', '#101214', '#070808']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.vignette} />
        <View style={styles.sheen} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.rim,
          { borderRadius: size / 2 },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 14,
    borderColor: 'rgba(0,0,0,0.42)',
  },
  sheen: {
    position: 'absolute',
    top: '6%',
    left: '18%',
    right: '18%',
    height: '16%',
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(184,137,58,0.45)',
    borderTopColor: 'rgba(228,201,138,0.35)',
    borderBottomColor: '#1A140C',
  },
});
