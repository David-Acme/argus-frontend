import type { Navigation } from '@/shared/theme';
import type { MenuAction, MenuDanger, MenuItem } from './menu-types';

export type MenuForm = 'sheet' | 'anchored';

export type MenuFormInput = { navigation: Navigation; finePointer: boolean };

export type MenuGroups = { actions: MenuAction[]; dangers: MenuDanger[] };

export type MenuRect = { x: number; y: number; width: number; height: number };

export type MenuBox = { width: number; height: number };

export type MenuPlacementInput = {
  anchor: MenuRect;
  panel: MenuBox;
  window: MenuBox;
  edge: number;
};

export type MenuPlacement = { left: number; top: number };

export function menuForm({ navigation, finePointer }: MenuFormInput): MenuForm {
  return navigation === 'bar' && !finePointer ? 'sheet' : 'anchored';
}

export function menuGroups(items: readonly MenuItem[]): MenuGroups {
  const actions: MenuAction[] = [];
  const dangers: MenuDanger[] = [];
  for (const item of items) {
    if (item.destructive) dangers.push(item);
    else actions.push(item);
  }
  return { actions, dangers };
}

const STEPS: Record<string, (index: number, last: number) => number> = {
  ArrowDown: (index, last) => (index >= last ? 0 : index + 1),
  ArrowUp: (index, last) => (index <= 0 ? last : index - 1),
  Home: () => 0,
  End: (_index, last) => last,
};

export function stepFocus(index: number, key: string, count: number): number | null {
  const step = STEPS[key];
  if (!step || count === 0) return null;
  return step(index, count - 1);
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), Math.max(low, high));

export function placeMenu({ anchor, panel, window, edge }: MenuPlacementInput): MenuPlacement {
  const right = anchor.x + anchor.width;
  const left = clamp(right - panel.width, edge, window.width - edge - panel.width);
  const below = anchor.y + anchor.height + edge / 2;
  const above = anchor.y - edge / 2 - panel.height;
  const fitsBelow = below + panel.height <= window.height - edge;
  const top = fitsBelow || above < edge ? below : above;
  return { left, top: clamp(top, edge, window.height - edge - panel.height) };
}
