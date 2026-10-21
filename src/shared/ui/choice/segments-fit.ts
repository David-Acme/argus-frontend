import { inset } from '@/shared/theme';

export const MAX_SEGMENTS = 4;

export type SegmentsFitInput = { width: number; contentWidths: readonly number[] };

export function segmentWidth(width: number, count: number): number {
  const { pad, gap } = inset.segment;
  return (width - pad * 2 - gap * (count - 1)) / count;
}

export function segmentsFit({ width, contentWidths }: SegmentsFitInput): boolean {
  const count = contentWidths.length;
  if (count === 0 || count > MAX_SEGMENTS) return false;
  if (width <= 0) return true;
  const room = segmentWidth(width, count) - inset.segment.minX * 2;
  return contentWidths.every((content) => content <= room);
}
