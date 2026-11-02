'use strict';

function sanitizeFamilyOrder(saved, fallback) {
  const allowed = [...fallback];
  if (allowed.length === 0) return [];
  const next = [];
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (typeof item !== 'string') continue;
      if (!allowed.includes(item) || next.includes(item)) continue;
      next.push(item);
    }
  }
  for (const id of allowed) {
    if (!next.includes(id)) next.push(id);
  }
  if (next.length !== allowed.length) return [...allowed];
  return next;
}

function moveRoomInFamily(order, id, toIndex) {
  const from = order.indexOf(id);
  if (from < 0) return [...order];
  const next = [...order];
  next.splice(from, 1);
  const clamped = Math.max(0, Math.min(next.length, toIndex));
  next.splice(clamped, 0, id);
  return next;
}

function nearestSlotIndex(slots, x, y) {
  if (!slots.length) return 0;
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const dx = x - (slot.x + slot.w / 2);
    const dy = y - (slot.y + slot.h / 2);
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function travelInto(slot, from, x, y) {
  const sameRow = Math.abs(from.y - slot.y) < 1;
  if (sameRow) return slot.x > from.x ? x - slot.x : slot.x + slot.w - x;
  return slot.y > from.y ? y - slot.y : slot.y + slot.h - y;
}

function insertionIndexForDrag(slots, x, y, currentIndex, lockedIndex = null) {
  if (!slots.length) return 0;
  const current = currentIndex >= 0 && currentIndex < slots.length ? slots[currentIndex] : null;
  if (!current) return nearestSlotIndex(slots, x, y);
  const rowDead = Math.max(24, current.h * 0.28);
  const colDead = Math.max(14, current.w * 0.16);
  let contained = -1;
  for (let i = 0; i < slots.length; i += 1) {
    if (i === currentIndex) continue;
    const slot = slots[i];
    const padX = Math.max(10, slot.w * 0.14);
    const padY = Math.max(20, slot.h * 0.24);
    if (x >= slot.x + padX && x <= slot.x + slot.w - padX && y >= slot.y + padY && y <= slot.y + slot.h - padY) {
      contained = i;
      break;
    }
  }
  if (contained >= 0) {
    if (lockedIndex != null && contained === lockedIndex) return currentIndex;
    const dest = slots[contained];
    const needed = Math.abs(current.y - dest.y) < 1 ? colDead : rowDead;
    if (travelInto(dest, current, x, y) < needed * 0.55) return currentIndex;
    return contained;
  }
  const nearest = nearestSlotIndex(slots, x, y);
  if (nearest === currentIndex) return currentIndex;
  if (lockedIndex != null && nearest === lockedIndex) return currentIndex;
  const dest = slots[nearest];
  const needed = Math.abs(current.y - dest.y) < 1 ? colDead : rowDead;
  if (travelInto(dest, current, x, y) < needed) return currentIndex;
  return nearest;
}

function layoutClassic(order) {
  const rows = [];
  for (let i = 0; i < order.length; i += 2) {
    const items = order.slice(i, i + 2);
    rows.push({ items, featured: false, centered: items.length === 1 });
  }
  return rows;
}

function slotsForRows(rows, cardW, cardH, featuredW, featuredH, gap) {
  const slots = [];
  let y = 0;
  for (const row of rows) {
    const h = row.featured ? featuredH : cardH;
    const w = row.featured ? featuredW : cardW;
    const rowW = row.items.length * w + Math.max(0, row.items.length - 1) * gap;
    let x = row.centered ? Math.max(0, (featuredW - rowW) / 2) : 0;
    for (const id of row.items) {
      slots.push({ id, x, y, w, h, featured: row.featured });
      x += w + gap;
    }
    y += h + gap;
  }
  return slots;
}

function layoutMatchesOrder(slots, order) {
  if (slots.length !== order.length) return false;
  const ids = slots.map((slot) => slot.id);
  if (new Set(ids).size !== ids.length) return false;
  for (const id of order) {
    if (!ids.includes(id)) return false;
  }
  const origins = new Set(slots.map((slot) => `${Math.round(slot.x)}:${Math.round(slot.y)}`));
  return origins.size === slots.length;
}

function assertHealthy(order, expected, label) {
  assert(order.length === expected.length, `${label} count ${order.length}`);
  assert(new Set(order).size === expected.length, `${label} unique`);
  for (const room of expected) assert(order.includes(room), `${label} missing ${room}`);
  const slots = slotsForRows(layoutClassic(order), 160, 200, 336, 148, 16);
  assert(layoutMatchesOrder(slots, order), `${label} unique slots`);
}

const classic = ['beatline', 'pulse', 'dial', 'pro', 'smart-pendulum', 'pendula-classic', 'ledgear', 'rig'];
const immersive = ['studio', 'altered', 'after-dark'];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

check('saved classic order keeps user sequence and appends rig', () => {
  const saved = ['ledgear', 'pulse', 'beatline', 'dial', 'pro', 'smart-pendulum', 'pendula-classic'];
  const next = sanitizeFamilyOrder(saved, classic);
  assert(next[0] === 'ledgear', 'featured-layout removal does not move LEDGear');
  assert(next.slice(0, 7).join() === saved.join(), 'custom order prefix kept');
  assert(next[next.length - 1] === 'rig', 'new face appends');
  assert(next.length === classic.length, 'no drop or duplicate');
  assert(new Set(next).size === next.length, 'unique after migrate');
});

check('default order when saved is missing', () => {
  assert(sanitizeFamilyOrder(null, classic).join() === classic.join(), 'classic default');
  assert(sanitizeFamilyOrder(undefined, immersive).join() === immersive.join(), 'immersive default');
});

check('malformed state falls back without losing rooms', () => {
  const next = sanitizeFamilyOrder(['dial', 'ghost', 12, 'dial'], classic);
  assert(next.length === classic.length, 'same count');
  assert(next[0] === 'dial', 'keeps valid prefix');
  assert(next.includes('beatline') && next.includes('ledgear'), 'missing rooms restored');
  assert(!next.includes('ghost'), 'unknown dropped');
});

check('cross-family ids cannot enter classic', () => {
  const next = sanitizeFamilyOrder(['studio', 'beatline'], classic);
  assert(!next.includes('studio'), 'immersive rejected');
  assert(next.includes('pulse'), 'classic intact');
});

check('reorder stays inside family', () => {
  const moved = moveRoomInFamily(classic, 'ledgear', 0);
  assert(moved[0] === 'ledgear', 'ledgear can lead classic');
  assert(moved.length === classic.length, 'no drop');
  const immersiveMove = moveRoomInFamily(immersive, 'after-dark', 0);
  assert(immersiveMove.join() === 'after-dark,studio,altered', immersiveMove.join());
});

check('vertical hover keeps current slot until clearly inside the next row', () => {
  const slots = [
    { id: 'a', x: 0, y: 0, w: 100, h: 100 },
    { id: 'b', x: 0, y: 116, w: 100, h: 100 },
  ];
  assert(insertionIndexForDrag(slots, 50, 108, 0) === 0, 'gap holds row 0');
  assert(insertionIndexForDrag(slots, 50, 120, 0) === 0, 'row band requires travel');
  assert(insertionIndexForDrag(slots, 50, 132, 0) === 0, 'shallow entry ignored');
  assert(insertionIndexForDrag(slots, 50, 160, 0) === 1, 'clearly inside row 1');
  assert(insertionIndexForDrag(slots, 50, 50, 1) === 0, 'clearly inside row 0');
  assert(insertionIndexForDrag(slots, 50, 160, 0, 1) === 0, 'locked displaced slot ignored');
});

check('reorder never drops or duplicates rooms', () => {
  const named = [
    ['ledgear', 0],
    ['beatline', 7],
    ['pulse', 0],
    ['dial', 5],
    ['pro', 1],
    ['smart-pendulum', 7],
    ['pendula-classic', 0],
    ['ledgear', 7],
    ['beatline', 0],
    ['pulse', 3],
    ['rig', 0],
  ];
  let order = [...classic];
  let ops = 0;
  for (const [id, index] of named) {
    order = moveRoomInFamily(order, id, index);
    ops += 1;
    assertHealthy(order, classic, `named ${id}`);
  }
  const script = [
    [0, 1],
    [0, 7],
    [7, 0],
    [0, 7],
    [7, 0],
    [1, 2],
    [2, 4],
    [4, 1],
    [3, 5],
    [5, 3],
  ];
  for (const [from, to] of script) {
    order = moveRoomInFamily(order, order[from], to);
    ops += 1;
    assertHealthy(order, classic, `script ${from}->${to}`);
  }
  for (let i = 0; i < 100; i += 1) {
    const id = order[i % order.length];
    const to = (i * 3 + 1) % order.length;
    order = moveRoomInFamily(order, id, to);
    ops += 1;
    assertHealthy(order, classic, `stress ${i}`);
  }
  assert(ops >= 100, `ops ${ops}`);
  const immersiveOrder = moveRoomInFamily(
    moveRoomInFamily(moveRoomInFamily(immersive, 'after-dark', 0), 'studio', 2),
    'altered',
    0
  );
  assert(immersiveOrder.length === 3, 'immersive count');
  assert(new Set(immersiveOrder).size === 3, 'immersive unique');
});

function autoscrollVelocityPxPerSec(fingerY, viewportTop, viewportBottom, contentOffsetY, contentMaxOffsetY, zone = 56, maxSpeed = 560) {
  const height = viewportBottom - viewportTop;
  if (height <= zone * 2) return 0;
  const topDist = fingerY - viewportTop;
  if (topDist >= 0 && topDist < zone && contentOffsetY > 0) {
    const t = 1 - topDist / zone;
    return -maxSpeed * t * t;
  }
  const bottomDist = viewportBottom - fingerY;
  if (bottomDist >= 0 && bottomDist < zone && contentOffsetY < contentMaxOffsetY - 0.5) {
    const t = 1 - bottomDist / zone;
    return maxSpeed * t * t;
  }
  return 0;
}

function nextScrollOffset(current, velocity, dtMs, maxOffset) {
  if (velocity === 0 || !(dtMs > 0)) return Math.min(maxOffset, Math.max(0, current));
  return Math.min(maxOffset, Math.max(0, current + (velocity * dtMs) / 1000));
}

function localPointAfterScroll(absX, absY, originX, originYAtStart, scrollAtStart, scrollNow) {
  return {
    x: absX - originX,
    y: absY - (originYAtStart - (scrollNow - scrollAtStart)),
  };
}

check('autoscroll activates at top and bottom edges', () => {
  assert(autoscrollVelocityPxPerSec(120, 100, 800, 200, 900) < 0, 'top zone scrolls up');
  assert(autoscrollVelocityPxPerSec(790, 100, 800, 200, 900) > 0, 'bottom zone scrolls down');
  assert(autoscrollVelocityPxPerSec(400, 100, 800, 200, 900) === 0, 'center is idle');
  const slow = autoscrollVelocityPxPerSec(145, 100, 800, 200, 900);
  const fast = autoscrollVelocityPxPerSec(102, 100, 800, 200, 900);
  assert(Math.abs(fast) > Math.abs(slow), 'speed grows toward the extreme edge');
});

check('autoscroll stops at bounds and outside the zone', () => {
  assert(autoscrollVelocityPxPerSec(110, 100, 800, 0, 900) === 0, 'top bound');
  assert(autoscrollVelocityPxPerSec(790, 100, 800, 900, 900) === 0, 'bottom bound');
  assert(autoscrollVelocityPxPerSec(90, 100, 800, 200, 900) === 0, 'finger left the viewport');
  assert(nextScrollOffset(12, -400, 16, 900) < 12, 'upward step');
  assert(nextScrollOffset(0, -400, 16, 900) === 0, 'clamp top');
  assert(nextScrollOffset(900, 400, 16, 900) === 900, 'clamp bottom');
});

check('drop index accounts for scroll offset', () => {
  const slots = [
    { id: 'a', x: 0, y: 0, w: 100, h: 100 },
    { id: 'b', x: 0, y: 116, w: 100, h: 100 },
    { id: 'c', x: 0, y: 232, w: 100, h: 100 },
    { id: 'd', x: 0, y: 348, w: 100, h: 100 },
  ];
  const originY = 200;
  const finger = { x: 80, y: 260 };
  const localBefore = localPointAfterScroll(finger.x, finger.y, 40, originY, 0, 0);
  assert(insertionIndexForDrag(slots, localBefore.x, localBefore.y, 0) === 0, 'still in first row before scroll');
  const localAfter = localPointAfterScroll(finger.x, finger.y, 40, originY, 0, 320);
  assert(insertionIndexForDrag(slots, localAfter.x, localAfter.y, 0) === 3, 'offscreen row is reachable after scroll');
});

if (failures.length) {
  console.error('ROOM ORDER TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('ROOM ORDER TESTS PASSED');
