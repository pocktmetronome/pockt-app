import { Image, type ImageSourcePropType, StyleSheet } from 'react-native';

/** Faithful V3 North Star hardware. V1 and V2 rasters are not imported. */
export const northStar = {
  headerRest: require('../../assets/north-star-v3/header_round_shell_rest.png'),
  headerPressed: require('../../assets/north-star-v3/header_round_shell_pressed.png'),
  wordmark: require('../../assets/north-star-v3/pockt_wordmark_northstar.png'),
  tempoRest: require('../../assets/north-star-v3/tempo_knob_shell_rest.png'),
  tempoPressed: require('../../assets/north-star-v3/tempo_knob_shell_pressed.png'),
  bpmBlank: require('../../assets/north-star-v3/bpm_well_blank.png'),
  beatShell: require('../../assets/north-star-v3/beat_button_shell.png'),
  beatGlowSoft: require('../../assets/north-star-v3/beat_glow_soft.png'),
  beatGlowNormal: require('../../assets/north-star-v3/beat_glow_normal.png'),
  beatGlowStrong: require('../../assets/north-star-v3/beat_glow_strong.png'),
  beatGlowCurrent: require('../../assets/north-star-v3/beat_glow_current.png'),
  visibilityShell: require('../../assets/north-star-v3/beat_visibility_shell.png'),
  lampOn: require('../../assets/north-star-v3/lamp_green.png'),
  lampDim: require('../../assets/north-star-v3/lamp_green_dim.png'),
  loopRest: require('../../assets/north-star-v3/loop_key_shell_rest.png'),
  loopPressed: require('../../assets/north-star-v3/loop_key_shell_pressed.png'),
  cover: require('../../assets/north-star-v3/beat_cover_plate.png'),
  beatPanel: require('../../assets/north-star-v3/beat_panel.png'),
  navTray: require('../../assets/north-star-v3/nav_tray.png'),
  navSelected: require('../../assets/north-star-v3/nav_selected_tile.png'),
  chassis: require('../../assets/north-star-v3/chassis_texture_512.png'),
  bronzeRest: require('../../assets/north-star-v3/transport_bronze_shell_rest.png'),
  bronzePressed: require('../../assets/north-star-v3/transport_bronze_shell_pressed.png'),
  primaryRest: require('../../assets/north-star-v3/transport_primary_shell_rest.png'),
  primaryPressed: require('../../assets/north-star-v3/transport_primary_shell_pressed.png'),
  darkRest: require('../../assets/north-star-v3/transport_dark_shell_rest.png'),
  darkPressed: require('../../assets/north-star-v3/transport_dark_shell_pressed.png'),
  pLogo: require('../../assets/north-star-v3/pockt_p_mark_transparent.png'),
};

/** Fills the control. Intrinsic PNG size must not escape the button. */
export function NorthStarImage({
  source,
  mode = 'contain',
  bleed = 0,
}: {
  source: ImageSourcePropType;
  mode?: 'contain' | 'stretch' | 'cover';
  bleed?: number;
}) {
  const scale = 1 + Math.max(0, bleed);
  return (
    <Image
      source={source}
      resizeMode={mode}
      style={[
        skin.fill,
        bleed > 0
          ? {
              width: `${scale * 100}%`,
              height: `${scale * 100}%`,
              left: `${((1 - scale) / 2) * 100}%`,
              top: `${((1 - scale) / 2) * 100}%`,
            }
          : null,
      ]}
    />
  );
}

const skin = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
});
