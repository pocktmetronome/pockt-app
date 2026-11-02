import { PocktDialControl, PocktLampView, PocktMechButton, PocktReadout } from 'pockt-controls';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Mounts each required native control by itself.
 * A red "Unimplemented component: ViewManagerAdapter_..." box means that
 * control's Fabric name still does not match the Expo module export.
 */
export default function NativeControlSmokeScreen() {
  return (
    <View style={styles.screen} testID="native-control-smoke">
      <Text style={styles.heading}>PocktDialControl</Text>
      <PocktDialControl bpm={120} style={styles.dial} />
      <Text style={styles.heading}>PocktMechButton</Text>
      <PocktMechButton accessibilityLabel="Smoke button" style={styles.button} />
      <Text style={styles.heading}>PocktLampView</Text>
      <PocktLampView accent="strong" playing={false} style={styles.lamp} />
      <Text style={styles.heading}>PocktReadout</Text>
      <PocktReadout value="120" fontSize={40} style={styles.readout} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141311', padding: 24, gap: 8 },
  heading: { color: '#F7F3EA', fontSize: 13, fontWeight: '700' },
  dial: { width: 180, height: 180, backgroundColor: '#000' },
  button: { width: 120, height: 48 },
  lamp: { width: 48, height: 48 },
  readout: { width: 160, height: 56 },
});
