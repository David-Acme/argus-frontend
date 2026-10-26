import { isShortWindow } from '@/shared/theme/window-layout';

export type SheetDetent = number | 'auto';

export type SheetFit = { detents: SheetDetent[]; scrolls: boolean };

export function sheetFit(long: boolean, height: number): SheetFit {
  if (isShortWindow(height)) return { detents: [1], scrolls: true };
  return long ? { detents: [0.6, 1], scrolls: true } : { detents: ['auto'], scrolls: false };
}
