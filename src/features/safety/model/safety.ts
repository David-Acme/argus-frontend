import { PANIC_HOLD_MS } from '@/shared/constants';

export const PIN_PATTERN = /^[0-9]{4,8}$/;

export type PinDraftProblem =
  | 'disarm-format'
  | 'duress-format'
  | 'disarm-trivial'
  | 'duress-trivial'
  | 'same'
  | null;

export const trivialPin = (pin: string): boolean => {
  if (pin.length < 2) return true;
  const digits = Array.from(pin, Number);
  const allSame = digits.every((digit) => digit === digits[0]);
  const steps = digits.slice(1).map((digit, index) => (digit - (digits[index] ?? digit) + 10) % 10);
  const ascending = steps.every((step) => step === 1);
  const descending = steps.every((step) => step === 9);
  const half = pin.length / 2;
  const repeatedHalves = pin.length % 2 === 0 && half >= 2 && pin.slice(0, half) === pin.slice(half);
  return allSame || ascending || descending || repeatedHalves;
};

export const pinDraftProblem = (disarmPin: string, duressPin: string): PinDraftProblem => {
  if (!PIN_PATTERN.test(disarmPin)) return 'disarm-format';
  if (!PIN_PATTERN.test(duressPin)) return 'duress-format';
  if (disarmPin === duressPin) return 'same';
  if (trivialPin(disarmPin)) return 'disarm-trivial';
  if (trivialPin(duressPin)) return 'duress-trivial';
  return null;
};

export const digitsOnly = (text: string): string => text.replace(/[^0-9]/g, '').slice(0, 8);

export const holdProgress = (pressedAt: number | null, now: number, holdMs = PANIC_HOLD_MS): number => {
  if (pressedAt === null) return 0;
  return Math.min(1, Math.max(0, (now - pressedAt) / holdMs));
};

export const holdComplete = (pressedAt: number | null, now: number, holdMs = PANIC_HOLD_MS): boolean =>
  holdProgress(pressedAt, now, holdMs) >= 1;
