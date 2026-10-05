import { describe, expect, test } from 'bun:test';
import { panicResultSchema, safetyStatusSchema } from '@/core/contracts/safety.contract';
import { digitsOnly, holdComplete, holdProgress, pinDraftProblem, trivialPin } from '@/features/safety/model/safety';

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
