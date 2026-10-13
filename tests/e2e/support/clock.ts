export const FIXED_NOW = Date.UTC(2026, 9, 12, 20, 0, 0);

export function installFixedClock(fixedNow: number): void {
  const RealDate = Date;
  const startedAt = performance.now();
  const now = (): number => fixedNow + Math.floor(performance.now() - startedAt);
  class FixedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(now());
      else super(...(args as [number]));
    }

    static override now(): number {
      return now();
    }
  }
  Object.defineProperty(window, 'Date', { configurable: true, writable: true, value: FixedDate });
}
