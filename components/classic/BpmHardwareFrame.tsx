import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

/**
 * Runtime bronze chassis around the V3 BPM well.
 * The well image stays the black inner face. This draws the outer plate and corner fasteners.
 */
export function BpmHardwareFrame({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children?: React.ReactNode;
}) {
  const screw = Math.max(7, Math.round(width * (10.5 / 154.7)));
  const rail = Math.max(6, Math.round(Math.min(width, height) * 0.145));
  const radius = Math.max(8, Math.round(height * 0.16));
  const edge = Math.max(1, Math.round(screw * 0.08));
  return (
    <View style={{ width, height }} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          left: 2,
          right: 2,
          top: 3,
          bottom: -2,
          borderRadius: radius,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      />
      <LinearGradient
        colors={['#5C4124', '#C6A36A', '#F0D7A4', '#A07840', '#3C2816']}
        locations={[0, 0.18, 0.42, 0.72, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: 'rgba(255,228,186,0.72)' }]}
      />
      <View
        style={{
          position: 'absolute',
          left: 1,
          right: 1,
          top: 1,
          height: Math.max(4, height * 0.2),
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          backgroundColor: 'rgba(255,236,200,0.42)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 2,
          right: 2,
          bottom: 1,
          height: Math.max(3, height * 0.12),
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
          backgroundColor: 'rgba(20,12,6,0.45)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: rail * 0.42,
          right: rail * 0.42,
          top: rail * 0.42,
          bottom: rail * 0.42,
          borderRadius: Math.max(6, radius - 3),
          backgroundColor: '#100C09',
          borderWidth: 2,
          borderColor: '#2A1A0E',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: rail,
          right: rail,
          top: rail,
          bottom: rail,
          borderRadius: Math.max(4, radius - 5),
          overflow: 'hidden',
        }}>
        {children}
      </View>
      <Fastener size={screw} style={{ left: edge, top: edge }} />
      <Fastener size={screw} style={{ right: edge, top: edge }} />
      <Fastener size={screw} style={{ left: edge, bottom: edge }} />
      <Fastener size={screw} style={{ right: edge, bottom: edge }} />
    </View>
  );
}

function Fastener({ size, style }: { size: number; style: { left?: number; right?: number; top?: number; bottom?: number } }) {
  const face = Math.round(size * 0.82);
  const cap = Math.round(size * 0.46);
  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#140E0A',
          borderWidth: 1,
          borderColor: '#3A2A18',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.7,
          shadowRadius: 1.4,
          shadowOffset: { width: 0, height: 1 },
        },
        style,
      ]}>
      <LinearGradient
        colors={['#FFF6E4', '#E8C78A', '#B8883E', '#5A3A1C', '#2A1A0E']}
        locations={[0, 0.22, 0.55, 0.82, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ width: face, height: face, borderRadius: face / 2 }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          left: size * 0.2,
          width: cap,
          height: cap,
          borderRadius: cap / 2,
          backgroundColor: 'rgba(255,244,214,0.55)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: Math.max(2, size * 0.18),
          height: Math.max(2, size * 0.18),
          borderRadius: size,
          backgroundColor: '#1A120C',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(90,60,30,0.8)',
        }}
      />
    </View>
  );
}
