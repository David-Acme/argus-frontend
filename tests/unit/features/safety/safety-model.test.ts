import { describe, expect, test } from 'bun:test';
import { panicResultSchema, safetyStatusSchema } from '@/core/contracts/safety.contract';
import {
  digitsOnly,
  holdComplete,
  holdProgress,
  phraseProblem,
  phraseWords,
  pinDraftProblem,
  trivialPin,
} from '@/features/safety/model/safety';

describe('PIN drafts', () => {
  test('both codes are 4 to 8 digits and different', () => {
    expect(pinDraftProblem('4719', '8352')).toBeNull();
    expect(pinDraftProblem('471', '8352')).toBe('disarm-format');
    expect(pinDraftProblem('4719', '83a2')).toBe('duress-format');
    expect(pinDraftProblem('4719', '4719')).toBe('same');
    expect(pinDraftProblem('471952683', '8352')).toBe('disarm-format');
  });

  test('codes the server refuses as trivial are caught before sending', () => {
    expect(pinDraftProblem('1234', '8352')).toBe('disarm-trivial');
    expect(pinDraftProblem('4719', '7777')).toBe('duress-trivial');
    for (const pin of ['1111', '1234', '4321', '7890', '0987', '9012', '2109', '1212', '123123', '45674567']) {
      expect(trivialPin(pin)).toBe(true);
    }
    for (const pin of ['4719', '1243', '8352', '135792', '13579']) {
      expect(trivialPin(pin)).toBe(false);
    }
  });

  test('typing keeps digits only, at most eight', () => {
    expect(digitsOnly('12-34 56')).toBe('123456');
    expect(digitsOnly('1234567890')).toBe('12345678');
  });
});

describe('hold to trigger', () => {
  test('progress runs over the hold and completes only at its end', () => {
    expect(holdProgress(null, 5000)).toBe(0);
    expect(holdProgress(1000, 2000, 2000)).toBe(0.5);
    expect(holdComplete(1000, 2999, 2000)).toBe(false);
    expect(holdComplete(1000, 3000, 2000)).toBe(true);
    expect(holdProgress(1000, 9000, 2000)).toBe(1);
  });
});

describe('safety contracts', () => {
  test('read the guard answers', () => {
    expect(safetyStatusSchema.safeParse({ duressEnabled: true, hasPin: false }).success).toBe(true);
    expect(safetyStatusSchema.safeParse({ duressEnabled: 'yes', hasPin: false }).success).toBe(false);
    expect(panicResultSchema.safeParse({ alertId: 4, sent: true, repeated: false }).success).toBe(true);
    expect(panicResultSchema.safeParse({ alertId: 0, sent: true, repeated: false }).success).toBe(false);
  });
});

describe('the duress phrase draft', () => {
  test('a phrase is 3 to 12 words, as the server counts them', () => {
    expect(phraseProblem('la lluvia de abril trae flores')).toBeNull();
    expect(phraseProblem('rojo, verde; azul!')).toBeNull();
    expect(phraseWords('  Señor   Ñandú, ¿qué tal?  ')).toEqual(['Señor', 'Ñandú', 'qué', 'tal']);
    expect(phraseProblem('dos palabras')).toBe('words');
    expect(phraseProblem('   ')).toBe('words');
    expect(phraseProblem(Array.from({ length: 13 }, () => 'palabra').join(' '))).toBe('words');
  });

  test('digits, control characters and more than 200 bytes are refused before sending', () => {
    expect(phraseProblem('tengo 3 gatos negros')).toBe('digits');
    expect(phraseProblem('rojo verde\nazul')).toBe('characters');
    expect(phraseProblem(Array.from({ length: 12 }, () => 'ñandúñandúñandú').join(' '))).toBe('long');
  });
});

describe('the duress phrase status', () => {
  test('the status reads hasPhrase, and an older server without it claims none', () => {
    expect(safetyStatusSchema.parse({ duressEnabled: true, hasPin: true, hasPhrase: true })).toEqual({
      duressEnabled: true,
      hasPin: true,
      hasPhrase: true,
    });
    expect(safetyStatusSchema.parse({ duressEnabled: true, hasPin: false })).toEqual({
      duressEnabled: true,
      hasPin: false,
      hasPhrase: false,
    });
  });

  test('a status never carries a phrase, even if an answer echoed one', () => {
    const status = safetyStatusSchema.parse({
      duressEnabled: true,
      hasPin: true,
      hasPhrase: true,
      duressPhrase: 'rojo verde azul',
    });
    expect(Object.keys(status).sort()).toEqual(['duressEnabled', 'hasPhrase', 'hasPin']);
    expect(JSON.stringify(status)).not.toContain('rojo verde azul');
  });
});
