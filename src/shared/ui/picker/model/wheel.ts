export type WheelKey = 'ArrowUp' | 'ArrowDown' | 'PageUp' | 'PageDown' | 'Home' | 'End';

const PAGE = 5;

const MOMENTUM = 0.12;

const LEADING_ZERO = /^0+(?=\d)/;

const KEYS: Record<WheelKey, (index: number, last: number) => number> = {
  ArrowUp: (index) => index - 1,
  ArrowDown: (index) => index + 1,
  PageUp: (index) => index - PAGE,
  PageDown: (index) => index + PAGE,
  Home: () => 0,
  End: (_index, last) => last,
};

const isWheelKey = (key: string): key is WheelKey => Object.hasOwn(KEYS, key);

export const clampIndex = (index: number, count: number): number =>
  Math.min(Math.max(index, 0), Math.max(0, count - 1));

export function wheelKey(index: number, key: string, count: number): number | null {
  if (!isWheelKey(key) || count === 0) return null;
  return clampIndex(KEYS[key](index, count - 1), count);
}

export type Fling = { offset: number; velocity: number; row: number; count: number };

export function settleIndex({ offset, velocity, row, count }: Fling): number {
  'worklet';
  const projected = offset + velocity * MOMENTUM;
  return Math.min(Math.max(Math.round(projected / row), 0), Math.max(0, count - 1));
}

export type TypeAhead = { buffer: string; index: number | null };

const matches = (label: string, text: string): boolean => {
  const plain = label.toLocaleLowerCase();
  return plain.startsWith(text) || plain.replace(LEADING_ZERO, '').startsWith(text);
};

export function typeAhead(buffer: string, typed: string, labels: readonly string[]): TypeAhead {
  const longer = `${buffer}${typed}`.toLocaleLowerCase();
  const found = labels.findIndex((label) => matches(label, longer));
  if (found >= 0) return { buffer: longer, index: found };
  const fresh = typed.toLocaleLowerCase();
  const again = labels.findIndex((label) => matches(label, fresh));
  return again >= 0 ? { buffer: fresh, index: again } : { buffer: '', index: null };
}
