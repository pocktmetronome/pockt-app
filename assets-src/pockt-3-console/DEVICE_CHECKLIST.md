# Console — physical-device acceptance

Code tests do **not** prove tactile feel, Metal compositing, or audio on an iPhone. Use this list on a real device after Gregg authorizes one internal TestFlight build.

## Tempo

1. Slow dial: every 1 BPM from ~118–127 and ~300–310. Number, pointer, and click stay together.
2. Fast rotation 20→400 and back. No jumps, no reverse, no snapback to the pre-drag value.
3. Lift the finger at a non-integer angle. Value stays on the last integer. Ring settles to that mark.
4. Tiny jiggle at rest does not change BPM.
5. Hard stops at 20 and 400. No haptic when already at the bound and nothing changes.
6. `−` / `+` each change exactly 1 BPM. Disabled at 20 / 400. No hold-to-repeat.
7. Dial, `+/−`, keypad, displayed number, and persisted tempo stay in agreement.
8. Second finger on the glass does not yank the active grab.

## Playback

9. Change tempo with the dial while playing. Click continues, no doubled beat, no silence, no restart.
10. Change tempo with `+/−` while playing. Same.
11. Center press still Play/Stops without changing BPM.
12. Adjustment click / haptic on a real BPM change only.

## Visual / chrome

13. Chassis is a full bronze deck. No second dial ring. No phone-in-phone silhouette.
14. Well frames the Metal bezel without covering ticks, pointer, or hub.
15. SOUND, TUNER, TAP, Play/Stop, POCKT, meter, subdivision, beats all still work.
16. Bottom rail still reaches DIAL, PULSE, PENDULUM, PRO, BEATLINE (MECHANICAL / LED GEAR remain).
17. POCKT P still opens Settings. No extra Settings face.

Record phone model, iOS version, and any mismatch. Do not treat a Windows Node pass as device evidence.
