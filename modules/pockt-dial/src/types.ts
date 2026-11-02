import type { ViewProps } from 'react-native';

export type PocktDialBpmEvent = {
  nativeEvent: {
    bpm: number;
  };
};

export type PocktDialGestureEvent = {
  nativeEvent: {
    active: boolean;
    angle?: number;
  };
};

export type PocktDialViewProps = ViewProps & {
  bpm?: number;
  playing?: boolean;
  invert?: boolean;
  haptic?: boolean;
  /** 'ring' turns the North Star flute ring natively instead of drawing the Metal dial. */
  face?: 'metal' | 'ring' | 'knurl' | 'wheel' | 'rim';
  onBpm?: (event: PocktDialBpmEvent) => void;
  /** The ring's turned angle in radians (clockwise positive), streamed while the finger turns it. */
  onTurn?: (event: { nativeEvent: { rad: number } }) => void;
  /** Override the inner edge of the touchable ring, as a fraction of the view's half-size. */
  innerFraction?: number;
  onCenterTap?: () => void;
  /** Wheel face: a touch that did not turn the ring. angle is clockwise from 12 o'clock, radius is 0–1 of the view's half-size. */
  onRingTap?: (event: { nativeEvent: { angle: number; radius: number } }) => void;
  /** Not emitted by the build 122 native module. Kept so the untouched home room still typechecks. */
  onGesture?: (event: PocktDialGestureEvent) => void;
};
