const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.transformer.unstable_allowRequireContext = true;
config.resolver.blockList = [
  /POCKT_AUDIO_SOURCE[/\\].*/,
  /POCKT_CATEGORY_KILLER_ASSETS_v1[/\\].*/,
  /POCKT_END_ALL_REFERENCE_PACK_2026-08-23[/\\].*/,
  /POCKT_FINAL_FORENSIC_PACK_2026-08-23[/\\].*/,
  /POCKT_FINAL_MASTER_v13[/\\].*/,
  /\.qa-v93[/\\].*/,
];

module.exports = config;
