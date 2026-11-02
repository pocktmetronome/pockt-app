# Dial only implementation audit

The v4 Dial home mounts `NorthStarDialTurn` from `components/classic/NorthStarDialTurn.tsx`.
`FoundationDialRoom` uses it only when `showDialArt && v4Shell && Platform.OS === 'ios'`.
Buttons, lights, nav, layout, and the non-v4 `PocktDialView` path are unchanged.

## Gesture path

`Gesture.Pan()` from `react-native-gesture-handler`, `minDistance(0)`, `shouldCancelWhenOutside(false)`.

1. `onBegin` stores `event.x` / `event.y` and the current rotation and BPM.
2. `onUpdate` computes `fingerAngle` with `atan2(y - cy, x - cx)` around the dial center from `onLayout`.
3. `wrapPi` keeps the angle delta inside (−π, π] so the wrap does not jump.
4. `turnDial` in `lib/dial-ring-turn.ts` does `rotation += delta`. Invert negates the delta.
5. The ring style is `transform: [{ rotateZ: \`${rotation.value}rad\` }]` from a Reanimated shared value.
6. `onFinalize` is empty. There is no `withTiming`, `withDecay`, fling, or snap.

## BPM

`DIAL_DEG_PER_BPM` is 3. Home pose is 120 BPM at rotation 0.
Continuous BPM is `originBpm + (rotation - originRotation) / 3°`.
`integerBpm` rounds, then clamps. Hard stops rewrite rotation at 20 and 400.
A new integer calls `hapticLight()` in `lib/haptics.ts` once, then `setBpm`.

## Touch order

Faceplate, identity, and the position arc are `pointerEvents="none"`.
The flute image sits in an `Animated.View` with `pointerEvents="none"`.
The `GestureDetector` is the last child of the dial and owns the touch.
`PocktInstrument` stays `pointerEvents="box-none"` at zIndex 6 so Minus, Plus, and the BPM key keep their own rects. Empty ring space falls through to the gesture.

## Artwork

`assets/north-star-v6/flute-ring.png` is the master annulus from radius 198 to 300. Center and outside are transparent. The outer scale, recess, champagne ring, and BPM center stay on the faceplate. The position arc does not rotate.

## Not in this binary

`PocktDialControl` and `PocktDialView` are not mounted on the v4 Dial home.
The development touch readout is not included.

