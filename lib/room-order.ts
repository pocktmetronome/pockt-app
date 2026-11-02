import { CLASSIC_ROOM_ORDER, CUSTOM_ROOM_ORDER, IMMERSIVE_ROOM_ORDER } from '@/constants/rooms';
import { sectionRows } from '@/lib/room-grid';
import type { RoomId } from '@/lib/types';

const CLASSIC_SET = new Set<RoomId>(CLASSIC_ROOM_ORDER);
const IMMERSIVE_SET = new Set<RoomId>(IMMERSIVE_ROOM_ORDER);

export type LayoutRow = { items: RoomId[]; featured: boolean; centered: boolean };

/** Merge saved order onto the canonical family list. Never drop rooms. Never cross families. */
export function sanitizeFamilyOrder(saved: unknown, fallback: readonly RoomId[]): RoomId[] {
  const allowed = [...fallback];
  if (allowed.length === 0) return [];
  const next: RoomId[] = [];
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (typeof item !== 'string') continue;
      const id = item as RoomId;
      if (!allowed.includes(id) || next.includes(id)) continue;
      next.push(id);
    }
  }
  for (const id of allowed) {
    if (!next.includes(id)) next.push(id);
  }
  if (next.length !== allowed.length) return [...allowed];
  return next;
}

export function sanitizeClassicOrder(saved: unknown): RoomId[] {
  return sanitizeFamilyOrder(saved, CLASSIC_ROOM_ORDER);
}

export function sanitizeImmersiveOrder(saved: unknown): RoomId[] {
  return sanitizeFamilyOrder(saved, IMMERSIVE_ROOM_ORDER);
}

export function isClassicRoom(id: RoomId): boolean {
  return CLASSIC_SET.has(id);
}

export function isImmersiveRoom(id: RoomId): boolean {
  return IMMERSIVE_SET.has(id);
}

export function isCustomRoom(id: RoomId): boolean {
  return CUSTOM_ROOM_ORDER.includes(id);
}

/** Move `id` to `toIndex` within the same family array. No-op if out of range. */
export function moveRoomInFamily(order: readonly RoomId[], id: RoomId, toIndex: number): RoomId[] {
  const from = order.indexOf(id);
  if (from < 0) return [...order];
  const next = [...order];
  next.splice(from, 1);
  const clamped = Math.max(0, Math.min(next.length, toIndex));
  next.splice(clamped, 0, id);
  return next;
}

export function layoutClassic(order: readonly RoomId[]): LayoutRow[] {
  return sectionRows(order, 2).map((row) => ({ items: row.items, featured: false, centered: row.centered }));
}

export function layoutImmersive(order: readonly RoomId[]): LayoutRow[] {
  return sectionRows(order, 3).map((row) => ({ items: row.items, featured: false, centered: row.centered }));
}

export function layoutCustom(): LayoutRow[] {
  return [{ items: [...CUSTOM_ROOM_ORDER], featured: true, centered: false }];
}

export type SlotFrame = { id: RoomId; x: number; y: number; w: number; h: number; featured: boolean };

export function slotsForRows(
  rows: LayoutRow[],
  cardW: number,
  cardH: number,
  featuredW: number,
  featuredH: number,
  gap: number
): SlotFrame[] {
  const slots: SlotFrame[] = [];
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

export function nearestSlotIndex(slots: SlotFrame[], x: number, y: number): number {
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

export function gridHeight(slots: SlotFrame[]): number {
  let max = 0;
  for (const slot of slots) max = Math.max(max, slot.y + slot.h);
  return max;
}

export function slotOriginsAreUnique(slots: SlotFrame[]): boolean {
  const seen = new Set<string>();
  for (const slot of slots) {
    const key = `${Math.round(slot.x)}:${Math.round(slot.y)}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

export function layoutMatchesOrder(slots: SlotFrame[], order: readonly RoomId[]): boolean {
  if (slots.length !== order.length) return false;
  const ids = slots.map((slot) => slot.id);
  if (new Set(ids).size !== ids.length) return false;
  for (const id of order) {
    if (!ids.includes(id)) return false;
  }
  return slotOriginsAreUnique(slots);
}

function travelInto(slot: SlotFrame, from: SlotFrame, x: number, y: number): number {
  const sameRow = Math.abs(from.y - slot.y) < 1;
  if (sameRow) {
    return slot.x > from.x ? x - slot.x : slot.x + slot.w - x;
  }
  return slot.y > from.y ? y - slot.y : slot.y + slot.h - y;
}

/**
 * Insertion index from a finger point. The dragged room keeps its current index until the
 * pointer is clearly inside another slot (with a row/column dead-zone). `lockedIndex` is the
 * slot the displaced neighbor just moved into — ignore it until the finger leaves.
 */
export function insertionIndexForDrag(
  slots: SlotFrame[],
  x: number,
  y: number,
  currentIndex: number,
  lockedIndex: number | null = null
): number {
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

/** Prefer the slot that contains the point. Row crossings need extra travel so the order cannot chatter. */
export function slotIndexWithHysteresis(
  slots: SlotFrame[],
  x: number,
  y: number,
  currentIndex: number,
  _bias = 1.38,
  lockedIndex: number | null = null
): number {
  return insertionIndexForDrag(slots, x, y, currentIndex, lockedIndex);
}
