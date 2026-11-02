# Universal shell — historical failure checklist

Each item is a regression the Dial-host shell must not repeat. Marked during the final pass.

| ID | Failure | Why earlier passes lost | Result |
| --- | --- | --- | --- |
| F01 | Procedural fake metal | Gradients and Skia plates stood in for machined hardware | NOT PRESENT. ChassisFill is the photographic plate |
| F02 | Flat vector / game UI | Ionicons, cards, and HUD chips replaced instrument keys | FIXED. Header and nav use one stroke set |
| F03 | Oversized or undersized Dial | The well was either cropped or shrunk to save chrome | NOT PRESENT. Dial stays the largest square object |
| F04 | Controls clipping each other | Header knobs, BPM, and the well shared one band | FIXED. 672 layout cycles found no overlap |
| F05 | Nav sitting too high | Rail floated with empty space under it | FIXED. Nav reaches the screen bottom above the home inset |
| F06 | Compressed Phrase area | Beat/phrase deck was crushed to enlarge other chrome | NOT PRESENT. Phrase zone stays at least 68pt |
| F07 | Shell forcing the face to shrink | Chrome was sized first and the instrument got the remainder scraps | FIXED. Dial diameter stays at least 160 and fills the well |
| F08 | Image-extraction contamination | Controls were sliced out of generated phone screenshots | NOT PRESENT. Contract PNGs are not mounted |
| F09 | Baked dynamic information | BPM, meter, and play state were painted into art | NOT PRESENT. BPM, meter, and play/stop are runtime |
| F10 | Inconsistent hardware language | Knobs, pills, and Ionicons disagreed | FIXED. TAP, Play, meter, and P share the transport row |
| F11 | Wrong typography | Tempo nicknames, taglines, and mixed tracking | FIXED. Tagline and tempo nickname are off the face |
| F12 | Weak hierarchy | Play was the same size as neighboring chips | FIXED. Play is taller than TAP and P |
| F13 | Redundant meter / subdivision | Meter appeared in the header and again on the rail | NOT PRESENT. One transport key shows meter and subdivision |
| F14 | Bad Play proportions | Wide bars and square caps were rejected | FIXED. Play has rest, down, committing, and stop faces |
| F15 | Generic settings-panel appearance | P opened as a mystery oversized control | FIXED. P matches the TAP key family |
| F16 | Inconsistent press states | Playing reused the finger-down plate | FIXED. Down plate and stop glyph are separate |
| F17 | shell-v2 failures | shell-v2 rebuilt the Dial and the whole phone as one photograph | NOT PRESENT. Approved Dial V3 remains the instrument |
| F18 | Build 151 device feedback | Device notes rejected ornamental motion, clipped home-indicator hits, and a second tempo UI | FIXED. ±1 stays on the Dial landing. Hits clear the home inset |
| F19 | Sound and Tuner as header knobs | Round SOUND/TUNER caps crowded the BPM and were not the roadmap header | FIXED. Fork and speaker are the header |
| F20 | Nav inventory drift | Mocks swapped Tuner, Sound, Meter, and Phrase onto the rail | NOT PRESENT. Rail is the six instruments |
| F21 | Dial gesture rewritten to fit a picture | Scale, flywheel, and numeral rotation were retuned per screenshot | NOT PRESENT. Dial V3 art and gesture were not edited |
| F22 | Other faces rebuilt during a shell pass | Rhythm, Pulse, Pendulum, Pro, and Beatline interiors were redrawn to chase mocks | NOT PRESENT. Shared chrome only |
