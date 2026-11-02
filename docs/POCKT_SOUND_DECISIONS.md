# POCKT sound and UX decisions — August 25, 2026

## Presets first
Rooms expose a short preset row. Tap applies immediately and configures DOWNBEAT / BEAT / SUBDIVISION together.

Classic, Studio, Wood, Deep, Digital, Perc, Voice, Minimal.

## Deep customization second
The shared Sound library sheet has horizontal family tabs plus an Advanced Mix editor for independent DOWNBEAT / BEAT / SUBDIVISION assignment. Preview plays without assigning. Select assigns immediately. Close is explicit.

## Categories not chaos
Purchased originals stay in `POCKT_AUDIO_SOURCE/` (archival). Only derived one-shots plus existing POCKT clicks ship. Metro and EAS ignore the source tree.

## Voice counting
Licensed vocal packs are shouts/breaths/dialogue, not isolated spoken numbers 1–4. Voice Count is not exposed as a fake spoken meter. Short attack hits live in VOCAL / TEXTURE. The native `voiceCount` path remains ready if isolated number takes are later licensed.

## Sound Studio
Every classic skin uses one SOUND control that opens the shared Sound Studio. Persistent MET 1 / WOOD / DIGITAL chips are removed from the playing surface.

## Single-choice menus
Time signature and subdivision tap apply and close. Beatline RhythmPanel has no Done control. Classic Pro subdivision sheet has no Done control. Sound tap applies immediately.

## Freeform Custom
Widget `x/y` persist as normalized coordinates. Done saves the draft as-is and keeps an optimistic layout so persist cannot snap the user back. Clamping only keeps a sliver of each control on-canvas.

## Rotary stop
Classic Pro SafeDial no longer rewrites rotation from BPM on finger-up. Rotation only resyncs when an external BPM change disagrees by more than 0.5 BPM.

## Orbit / Tempo
Those rooms remain retired. Gallery order is Beatline → Pulse → Dial → Pro → Smart Pendulum → Mechanical → LED Gear, then Custom, then Immersive.
