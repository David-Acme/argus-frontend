const FINE_POINTER = '(hover: hover) and (pointer: fine)';

export function hasFinePointer(): boolean {
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(FINE_POINTER).matches;
}
