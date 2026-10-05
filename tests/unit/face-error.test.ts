import { describe, expect, mock, test } from 'bun:test';
import type { TranslateFn } from '@/core/types';

mock.module('@/core/i18n', () => ({ t: (key: string) => key }));
mock.module('@/core/stores', () => ({
  useAuthStore: { getState: () => ({ user: null }), subscribe: () => () => undefined },
  useToastStore: { getState: () => ({ show: () => 'toast', dismiss: () => undefined }) },
  useConfirmStore: { getState: () => ({ ask: () => undefined }) },
}));

const { faceErrorMessage } = await import('@/features/auth/model/face-error');

const t = ((key: string) => key) as TranslateFn;

describe('faceErrorMessage', () => {
  test('an unmapped code never shows the backend wording', () => {
    expect(
      faceErrorMessage({ code: 'EMBEDDING_STORE_FAILED', message: 'sqlite: disk I/O error' }, t)
    ).toBe('screens.face.error');
  });

  test('a disabled account is told so, not that the face is unknown', () => {
    expect(
      faceErrorMessage({ code: 'ACCOUNT_DISABLED', message: 'User account is disabled' }, t)
    ).toBe('common.errors.account-disabled');
  });

  test('a known transport refusal reads like the rest of the app', () => {
    expect(faceErrorMessage({ code: 'TIMEOUT', message: 'deadline' }, t)).toBe(
      'common.errors.timeout'
    );
    expect(faceErrorMessage({ code: 'SERVICE_UNAVAILABLE', message: '' }, t)).toBe(
      'common.errors.unavailable'
    );
  });

  test('a refused liveness or quality check guides the person instead of calling them unknown', () => {
    expect(
      faceErrorMessage({ code: 'LIVENESS_CHECK_FAILED', message: 'The face did not pass the liveness check' }, t)
    ).toBe('screens.face.error-liveness');
    expect(faceErrorMessage({ code: 'LIVENESS_UNAVAILABLE', message: '' }, t)).toBe(
      'screens.face.error-liveness-unavailable'
    );
    expect(
      faceErrorMessage({ code: 'FACE_QUALITY_INSUFFICIENT', message: 'One clear, well-lit face is required' }, t)
    ).toBe('screens.face.error-face-quality');
  });

  test('face outcomes keep their own guidance', () => {
    expect(faceErrorMessage({ code: 'UNAUTHORIZED', message: 'Face not recognized' }, t)).toBe(
      'screens.face.error-face-not-recognized'
    );
    expect(faceErrorMessage({ code: 'NETWORK_ERROR', message: 'offline' }, t)).toBe(
      'screens.face.error-network'
    );
  });
});
