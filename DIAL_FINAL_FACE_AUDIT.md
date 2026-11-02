# Dial final face audit

The 12-o'clock face is rebuilt from the North Star photograph. The physical dial center is the polar origin. At each radius the repair spans only the needle, its glow, and the printed 120. Color is a cosine blend between robust samples just outside that span, so the bright left side of the dial falls into the darker right side. Brush grain is copied from the same radius on the neighboring clean sector and added back inside the span. The blend feathers into the untouched face. The printed 120 is not painted into the face. It is the static overlay `dial-fixed-120.png`: the original 1 and 0, and the upright 2 taken from the printed 200.

## Wedge versus same-radius prediction

Prediction is the cosine between the face 14° left of center and 14° right of center. Tick pixels are excluded. The residual includes the restored brush grain, so it is not a flat-fill error.

- Samples: 1008
- Mean absolute luminance delta: 3.51
- 95th percentile delta: 8.30
- Maximum delta: 21.95
- Left transition (about −12° to −8°): 2.29
- Right transition (about +8° to +12°): 2.71

## Angular derivative

Mean one-degree step inside the repaired center: 1.55
Mean step on the untouched face just left of the wedge: 2.18
Mean step on the untouched face just right of the wedge: 1.04

The repaired center does not add a derivative spike. Its step sits between the busier left face and the quieter right face.

## Fixed 120

`dial-fixed-120.png` is transparent except for the stationary numeral. The 1 and 0 are the original North Star strokes. The 2 is the upright 2 from the printed 200, placed in the middle slot and tinted to the 12-o'clock ink. It does not rotate. At 120 BPM the needle covers it the same way the reference needle covers the printed 120.

## Reference

390 reference mean absolute error against `screen-reference.png`: 4.037 (luminance 4.072). Previous accepted render was 3.916. The difference is the repaired wedge beside the needle and the rebuilt middle digit.
