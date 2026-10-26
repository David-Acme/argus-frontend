import { itemEnd, type AgendaItem } from './agenda-items';

export type Span = { from: number; to: number };

export type FreeSlotRules = { after: number; minMs: number; pointMs: number };

export type TimelineEntry =
  { type: 'item'; item: AgendaItem } | { type: 'free'; id: string; from: number; to: number };

const MINUTE_MS = 60_000;

export const FREE_SLOT_RULES = { minMs: 60 * MINUTE_MS, pointMs: 30 * MINUTE_MS } as const;

export function busySpan(item: AgendaItem, pointMs: number): Span {
  if (item.kind === 'event') return { from: item.startsAt, to: itemEnd(item) };
  return { from: item.startsAt, to: item.startsAt + pointMs };
}

export function freeSlots(
  busy: readonly Span[],
  { after, minMs }: Omit<FreeSlotRules, 'pointMs'>
): Span[] {
  const sorted = [...busy].sort((left, right) => left.from - right.from);
  const first = sorted[0];
  if (!first) return [];
  const slots: Span[] = [];
  let cursor = first.to;
  for (const span of sorted.slice(1)) {
    const from = Math.max(cursor, after);
    if (span.from - from >= minMs) slots.push({ from, to: span.from });
    cursor = Math.max(cursor, span.to);
  }
  return slots;
}

export function dayTimeline(items: readonly AgendaItem[], rules: FreeSlotRules): TimelineEntry[] {
  const timed = items.filter((item) => !item.allDay);
  const slots = freeSlots(
    timed.map((item) => busySpan(item, rules.pointMs)),
    rules
  );
  const entries: TimelineEntry[] = items.map((item) => ({ type: 'item', item }));
  for (const slot of slots) {
    const index = entries.findIndex(
      (entry) => entry.type === 'item' && !entry.item.allDay && entry.item.startsAt >= slot.to
    );
    entries.splice(index < 0 ? entries.length : index, 0, {
      type: 'free',
      id: `free:${slot.from}`,
      ...slot,
    });
  }
  return entries;
}
