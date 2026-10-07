import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import { readEnvelope } from '@/core/services/http/http-envelope';
import type { TranslateFn } from '@/core/types';
import { invitationRevokedBy, invitationRevokedText } from '@/features/auth/model/invitation-refusal';
import { invitationClosingOf, invitationStateOf } from '@/features/people/model/people-optimistic';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const refusal = (moduleId: string | null) =>
  readEnvelope(
    410,
    JSON.stringify({
      status: 410,
      info: null,
      errors: [
        { code: 'INVITATION_MODULE_DISABLED', message: 'Revoked' },
        ...(moduleId ? [{ code: 'MODULE_ID', message: moduleId }] : []),
      ],
    })
  ).errors;

describe('an invitation revoked because its module went off', () => {
  test('the invitee is told which module, from the refusal list', () => {
    expect(invitationRevokedBy(refusal('surveillance'))).toEqual({ moduleId: 'surveillance' });
    expect(invitationRevokedBy(refusal(null))).toEqual({ moduleId: null });
    expect(invitationRevokedBy({ code: 'NOT_FOUND', message: 'x' })).toBeNull();
    expect(invitationRevokedBy(null)).toBeNull();
  });

  test('says it in plain words in both languages, for a known module and an unknown one', () => {
    expect(invitationRevokedText({ moduleId: 'surveillance' }, es)).toContain('Vigilancia');
    expect(invitationRevokedText({ moduleId: 'surveillance' }, en)).toContain('Surveillance');
    expect(invitationRevokedText({ moduleId: 'agronomy' }, en)).toContain('Agronomy');
    expect(invitationRevokedText({ moduleId: 'new-thing' }, es)).toContain('un módulo');
    expect(invitationRevokedText({ moduleId: null }, en)).toContain('a module');
  });

  test('the inviter sees the reason on the closed invitation and only then', () => {
    const closed = { revokedAt: 5, revokedReason: 'module_disabled', revokedModule: 'surveillance' };
    expect(invitationClosingOf(closed)).toEqual({ reason: 'module', moduleId: 'surveillance' });
    expect(invitationClosingOf({ ...closed, revokedAt: null })).toBeNull();
    expect(invitationClosingOf({ ...closed, revokedReason: null })).toBeNull();
    expect(invitationClosingOf({ revokedAt: 5 })).toBeNull();
    expect(
      invitationStateOf({ ...closed, expiresAt: 9_999_999_999, redemptionCount: 0, maxRedemptions: 1 }, 1_000)
    ).toBe('closed');
  });
});
