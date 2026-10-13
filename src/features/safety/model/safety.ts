import type { SafetyReach } from '@/core/types';
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

export const PHRASE_MIN_WORDS = 3;
export const PHRASE_MAX_WORDS = 12;
export const PHRASE_MAX_BYTES = 200;

export type PhraseProblem = 'words' | 'digits' | 'characters' | 'long' | null;

export const phraseWords = (phrase: string): string[] => phrase.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? [];

const utf8Bytes = (text: string): number =>
  Array.from(text).reduce((total, character) => {
    const code = character.codePointAt(0) ?? 0;
    return total + (code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4);
  }, 0);

const isControl = (character: string): boolean => {
  const code = character.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f;
};

export function phraseProblem(phrase: string): PhraseProblem {
  if (utf8Bytes(phrase) > PHRASE_MAX_BYTES) return 'long';
  if (/[0-9]/.test(phrase)) return 'digits';
  if (Array.from(phrase).some(isControl)) return 'characters';
  const count = phraseWords(phrase).length;
  return count < PHRASE_MIN_WORDS || count > PHRASE_MAX_WORDS ? 'words' : null;
}

export type ReachNotice = 'nobody' | 'contacts' | 'unknown' | null;

export const reachNotice = (reach: SafetyReach | null): ReachNotice =>
  reach === 'nobody' || reach === 'contacts' || reach === 'unknown' ? reach : null;

export const enableNeedsReachWarning = (reach: SafetyReach | null): boolean => reach === 'nobody';

