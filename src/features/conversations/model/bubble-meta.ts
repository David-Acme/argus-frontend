import type { BubbleStatus } from '@/features/conversations/model/receipts';

export type MetaReserveInput = { label: string; glyph: boolean };

export const META_BREAK = ' ';

export const META_GAP = '  ';

export const META_GLYPH_ROOM = '   ';

export const metaLabelOf = (time: string, note: string | null): string =>
  note ? `${note} · ${time}` : time;

export function metaReserveOf({ label, glyph }: MetaReserveInput): string {
  const unbroken = label.replace(/\s/g, ' ');
  return `${META_BREAK}${META_GAP}${unbroken}${glyph ? META_GLYPH_ROOM : ''}`;
}

export const glyphShownOf = (
  status: BubbleStatus | null
): status is Exclude<BubbleStatus, 'failed'> => status !== null && status !== 'failed';
