'use strict';

/** Approximate glyph width for the proof typeface. Used by the renderer and the QA gate. */
function textWidth(text, fontPx) {
  return String(text).length * fontPx * 0.58;
}

function fits(text, fontPx, boxWidth) {
  return textWidth(text, fontPx) <= boxWidth - 8;
}

function navFont(slotWidth) {
  let size = 8.5;
  while (size > 6.25 && !fits('PENDULUM', size, slotWidth)) size -= 0.25;
  return size;
}

function loopFont(boxWidth) {
  let size = 9;
  while (size > 7 && !fits('LOOP', size, boxWidth - 16)) size -= 0.5;
  return size;
}

module.exports = { textWidth, fits, navFont, loopFont };
