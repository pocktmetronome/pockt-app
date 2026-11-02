
POCKT — WORLD-CLASS SKINS / NAVIGATION / METRONOME IMPLEMENTATION PROMPT

You are working in the existing POCKT React Native / Expo project.

OBJECTIVE
Turn POCKT into a premium, production-ready metronome with two clearly organized visual skin families:
1. CLASSIC — tactile, precision-hardware skins built around premium physical-control aesthetics.
2. IMMERSIVE — cinematic living-world skins with animated environments and beat-synchronized visual behavior.

Do not redesign the working app from scratch. Preserve existing working metronome functionality, library functionality, timing engine improvements, navigation routes, and any already-approved skins unless this prompt explicitly changes them.

NON-NEGOTIABLE PRIORITIES
1. Timing accuracy is the #1 requirement.
2. Audio and haptic feedback must remain synchronized and stable at all supported BPM values.
3. No UI action may crash the app.
4. Every skin must feel native, silky, responsive, premium, and intentional.
5. Navigation must be obvious and reversible from every screen.
6. All supplied image assets must be used as independent files, never composited from a storyboard image.
7. Do not fake visual depth with cheap gradients when a supplied production asset exists.

======================================================================
A. NEW SKIN ARCHITECTURE
======================================================================

Create two top-level skin categories:

CLASSIC
- Existing Classic skin(s)
- New Titanium Receiver skin
- Any current hardware/precision-oriented skin belongs here

IMMERSIVE
- Altered
- After Dark
- Studio
- Heavy
- Roots
- Sundown

The skin selector should first show the two category cards:
- CLASSIC
- IMMERSIVE

Then selecting a category opens a polished horizontal/vertical skin browser for that category.

The skin selection flow must:
- Always have a visible back affordance
- Never strand the user
- Preserve the selected BPM and time signature while browsing
- Preview the chosen skin instantly
- Save selected skin persistently
- Restore that skin after app relaunch
- Animate category and skin transitions smoothly, without flashes or layout jumps

Navigation hierarchy:
Home / Metronome
→ Skin control
→ Category selector
→ Skin browser
→ Select skin
→ Return automatically to metronome OR show a clear Done/Apply action

Do not use confusing modal stacks.

======================================================================
B. ASSET MAPPING
======================================================================

Create an asset registry so visual files are referenced centrally, not hardcoded throughout components.

Recommended folders:

assets/
  skins/
    classic/
      titanium/
        classic_titanium_background.png
        titanium_receiver_dial.png
    immersive/
      heavy/
        heavy_opening.png
        heavy_landing.png
      roots/
        roots_opening.png
        roots_landing.png
      sundown/
        sundown_opening.png
        sundown_landing.png

If the delivered filenames differ, map them here once and keep the application code clean.

Use contain/cover rules intentionally:
- Full-screen world art: cover
- Transparent dial asset: contain
- Never stretch artwork non-uniformly
- Respect safe areas, Dynamic Island, and variable iPhone screen heights

======================================================================
C. OPENING / CURTAIN EXPERIENCE
======================================================================

Fix the curtain/opening behavior.

Requirements:
- Curtain/opening visual must always be visible when a skin uses one.
- No instant pop-in.
- No black-frame flicker.
- No missing layer caused by z-index or mount timing.
- Opening sequence should feel cinematic but fast.
- User must never feel blocked by an overly long intro.

Recommended sequence:
0–150 ms: screen ready / background preloaded
150–700 ms: opening art resolves in
700–1100 ms: subtle skin-specific movement
~1100 ms: landing UI reveals
Animation can be skipped/reduced when app state indicates it has already played recently.

Honor Reduce Motion accessibility settings.

======================================================================
D. BPM INPUT — FIX THE CRASH COMPLETELY
======================================================================

The current BPM-entry flow crashes when the user attempts to set BPM. Fix the root cause, not just the symptom.

Requirements:
- No crash when opening BPM input
- No crash while entering digits
- No crash on backspace
- No crash on Set / Enter
- No crash on invalid values
- No keyboard focus trap
- No route trap

BPM input screen:
- Top-left: BACK arrow
- Numeric display centered and prominent
- Numeric keypad
- Dedicated small BACKSPACE key within keypad
- Bottom primary action: green ENTER or SET button
- Never label the primary action “Backspace”
- Back arrow returns to prior screen without changing BPM
- Set/Enter validates, applies BPM, gives premium haptic confirmation, and returns

Validation:
- Only numeric BPM values
- Clamp or reject outside supported range with clear feedback
- Use the app’s supported range consistently everywhere
- Do not allow stale/NaN/string values to reach the timing engine

======================================================================
E. METRONOME TIMING — IMMACULATE
======================================================================

Audit the current timing implementation before changing visuals.

Goal:
Metronome pulse timing must remain stable and accurate from the lowest supported BPM through the maximum supported BPM.

Do not rely on JavaScript setInterval as the sole timing source.

Preferred architecture:
- Use the most accurate audio-clock / native audio scheduling mechanism available in the current Expo/React Native stack.
- Schedule audio ahead of playback time.
- UI animation follows the timing source; UI animation must never be the timing source.
- Haptics must be triggered as close as technically possible to the scheduled beat without blocking audio scheduling.
- Avoid rebuilding timers on every render.
- Keep scheduling logic outside high-frequency React render paths.
- Prevent accumulating drift.
- Prevent double scheduling after route changes or app background/foreground transitions.
- Cleanly stop timers/schedulers on unmount.
- Reinitialize safely after app resumes.

Test at minimum:
40, 60, 80, 100, 120, 143, 180, 240, 300, 400 BPM
and the app’s actual maximum if higher.

Track:
- average beat interval
- max deviation
- drift over 30 sec
- drift over 5 min

The audio scheduler owns truth.
The visual pulse and haptic pulse subscribe to beat events.

======================================================================
F. SOUND
======================================================================

Premium sound behavior:
- Clean, short transient
- No clipping
- No overlapping muddy tail at high BPM
- Accent beat must be clearly distinguishable
- No audio latency introduced by skin changes
- Audio should remain active when visual animations are intensive
- Preload samples before playback
- Avoid decoding/loading samples on each beat

If there are multiple click sounds, keep them tightly normalized in perceived loudness.

======================================================================
G. HAPTICS
======================================================================

Haptics should feel expensive, not gimmicky.

- Downbeat: stronger impact
- Regular beat: lighter impact
- Skin changes: subtle selection haptic
- BPM Set: medium confirmation
- Dial steps: tiny tactile tick, rate-limited so rapid dial movement does not overwhelm the Taptic Engine

Do not trigger haptics from animation frame callbacks.

======================================================================
H. TITANIUM RECEIVER / CLASSIC SKIN
======================================================================

Use supplied classic_titanium_background.png and titanium_receiver_dial.png.

Design intent:
A world-class audiophile receiver control — matte titanium, machined precision, restrained lighting, excellent tactile response.

Behavior:
- Large rotary dial as primary BPM control
- Drag around circumference OR vertical drag gesture if that proves more reliable
- Tap BPM number to open exact numeric entry
- Dial gives micro haptic ticks
- Fine and coarse movement must feel predictable
- No accidental large jumps
- Red/orange index light or marker
- Premium reflective highlight can shift subtly with dial rotation
- Never rotate the entire photographic background; only dial layer and indicator
- Dial rotation visually interpolates smoothly while BPM value updates deterministically

Do not overcomplicate the interface.
Primary screen hierarchy:
BPM
tempo name
dial
play/stop
tap tempo
time signature
skin/library/navigation controls

======================================================================
I. IMMERSIVE SKINS
======================================================================

Use the supplied opening and landing files as production backgrounds.

HEAVY
Mood:
Dark industrial power, blackened steel, smoke, ember energy, impact.

Beat visualization:
- Low-frequency circular pressure pulse
- Tiny ember flare on downbeat
- Controlled red energy around the dial/center
- No cheesy flames
- Subtle background breathing only
- Downbeat can create a short heavier shockwave

ROOTS
Mood:
Organic, grounded, ancient wood, roots, earth, depth.

Beat visualization:
- Radial root resonance
- Warm amber/green pulse traveling subtly through root lines
- Downbeat creates a slightly deeper root illumination
- Natural, slow ambient motion between beats
- Avoid fantasy-game clichés

SUNDOWN
Mood:
Cinematic horizon, warm sun, ocean/land glow, premium golden-hour atmosphere.

Beat visualization:
- Sun/horizon pulse
- Thin concentric light bloom synchronized to beat
- Downbeat gives a brighter solar flare at horizon
- Extremely subtle cloud/water movement between beats
- Never distract from BPM readability

ALTERED / AFTER DARK / STUDIO
Keep their existing approved visual identities but migrate them into the same Immersive category architecture and make their transitions, controls, layout, and timing behavior consistent with the new system.

======================================================================
J. PERFORMANCE / VISUAL QUALITY
======================================================================

Target:
- Smooth interactions on current supported iPhones
- No jank during dial movement
- No dropped metronome beats due to visual rendering
- Preload the next likely skin asset when browsing
- Cache images
- Avoid mounting all immersive effects at once
- Pause hidden skin animations
- Use GPU-friendly transforms/opacity where possible
- Avoid unnecessary state updates at 60/120 FPS
- Use Reanimated/native-driven animation where appropriate
- Maintain crisp text and image quality on Retina displays

Metronome audio scheduling must have higher priority than decorative animation.

======================================================================
K. UI POLISH
======================================================================

Make every screen feel like one product.

- Consistent spacing
- Consistent safe-area handling
- Consistent corner radii
- Consistent typography hierarchy
- No clipped BPM text
- No controls behind Dynamic Island / status bar
- No controls touching home indicator
- No accidental overlap between BPM and navigation
- No temporary debug buttons
- No placeholder labels
- No inconsistent icon styles

Primary BPM number must remain the clearest element on every landing screen.

======================================================================
L. STATE / RELIABILITY
======================================================================

Persist:
- BPM
- selected skin
- selected category
- time signature
- sound preference
- haptic preference
- any existing user settings

Handle:
- app background/foreground
- interruption
- navigation while metronome is playing
- skin change while metronome is playing
- exact BPM entry while playing
- device rotation if currently supported
- rapid repeated taps
- repeated opening/closing of selectors

No crashes, no duplicate audio, no orphan timers.

======================================================================
M. QA CHECKLIST — DO NOT DECLARE COMPLETE UNTIL PASSED
======================================================================

1. Open every skin 20 times.
2. Change BPM through exact-input screen 50 times.
3. Verify Back works every time.
4. Verify green Set/Enter works every time.
5. Verify no “Backspace” primary button exists.
6. Verify curtain/opening art is always visible.
7. Start/stop metronome rapidly 50 times.
8. Change skin while playing.
9. Change BPM while playing.
10. Run 40 BPM for 5 minutes.
11. Run 120 BPM for 5 minutes.
12. Run 240 BPM for 5 minutes.
13. Run 400 BPM for 5 minutes.
14. Verify no audible drift.
15. Verify no beat duplication after background/foreground.
16. Verify no visual layer blocks touches.
17. Verify all navigation paths have a visible escape/back path.
18. Verify all art uses independent asset files, not storyboard crops.
19. Verify memory does not continuously grow while switching skins.
20. Remove all console spam and temporary debug UI.

======================================================================
N. DELIVERY
======================================================================

Implement the changes directly in the project.

Before finishing:
- Run TypeScript checks
- Run lint if configured
- Fix all introduced errors
- Verify imports and asset paths
- Verify Expo build compatibility
- Give a concise summary of files changed
- Identify any native dependency added
- Identify any remaining issue honestly

Do not stop at a mockup.
Do not leave TODO placeholders for core behavior.
Do not replace supplied art with generic gradients.
Do not alter the timing engine casually without validating it.
The final result must feel like a premium instrument, not a themed utility app.
