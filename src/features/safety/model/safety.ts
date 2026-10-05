import { PANIC_HOLD_MS } from '@/shared/constants';

export const PIN_PATTERN = /^[0-9]{4,8}$/;

export type PinDraftProblem = 'disarm-format' | 'duress-format' | 'same' | null;

export const pinDraftProblem = (disarmPin: string, duressPin: string): PinDraftProblem => {
  if (!PIN_PATTERN.test(disarmPin)) return 'disarm-format';
  if (!PIN_PATTERN.test(duressPin)) return 'duress-format';
  if (disarmPin === duressPin) return 'same';
  return null;
};

export const digitsOnly = (text: string): string => text.replace(/[^0-9]/g, '').slice(0, 8);

export const holdProgress = (pressedAt: number | null, now: number, holdMs = PANIC_HOLD_MS): number => {
  if (pressedAt === null) return 0;
  return Math.min(1, Math.max(0, (now - pressedAt) / holdMs));
};

export const holdComplete = (pressedAt: number | null, now: number, holdMs = PANIC_HOLD_MS): boolean =>
  holdProgress(pressedAt, now, holdMs) >= 1;
