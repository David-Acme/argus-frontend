import { describe, expect, test } from 'bun:test';
import type { IApiError, IServiceResponse } from '@/core/interfaces';
import { readDeclineAnswer } from '@/features/voice/model/rtc-protocol';

const accepted = (info: unknown): IServiceResponse<unknown> => ({ status: 200, ok: true, info, errors: null });

const refused = (status: number, code: string, message = ''): IServiceResponse<unknown> => {
  const errors: IApiError = { code, message };
  return { status, ok: false, info: null, errors };
};

describe('the answer to a decline', () => {
  test('a declined ring is read as declined', () => {
    expect(readDeclineAnswer(accepted({ declined: true }))).toEqual({ kind: 'declined' });
  });

  test('an answer of another shape is refused, never read as declined', () => {
    expect(readDeclineAnswer(accepted({ declined: 'yes' })).kind).toBe('refused');
    expect(readDeclineAnswer(accepted(null)).kind).toBe('refused');
  });

  test('a call that another device took, or that expired, is an outcome', () => {
    expect(readDeclineAnswer(refused(409, 'CALL_TAKEN'))).toEqual({ kind: 'outcome', outcome: 'taken' });
    expect(readDeclineAnswer(refused(410, 'CALL_EXPIRED'))).toEqual({ kind: 'outcome', outcome: 'expired' });
    expect(readDeclineAnswer(refused(404, 'CALL_NOT_FOUND'))).toEqual({ kind: 'outcome', outcome: 'not-found' });
  });

  test('a call that belongs to another user is refused with the code the backend gives', () => {
    expect(readDeclineAnswer(refused(403, 'FORBIDDEN', 'Access denied'))).toEqual({
      kind: 'refused',
      code: 'FORBIDDEN',
      message: 'Access denied',
    });
  });

  test('a failure without an envelope is a network refusal', () => {
    expect(readDeclineAnswer({ status: 0, ok: false, info: null, errors: null })).toEqual({
      kind: 'refused',
      code: 'NETWORK_ERROR',
      message: '',
    });
  });
});
