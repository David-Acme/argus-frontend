import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { privacyDirectorySchema } from '@/core/contracts/privacy.contract';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { PrivacyDirectory, UserPrivacy } from '@/core/types';
import {
  minorChangeOf,
  minorMarkOf,
  minorPath,
  minorStandingOf,
  normalizedMark,
  withMinorMark,
} from '@/features/privacy/model/minor';

const CHOICES = { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true };

const user = (userId: number, patch: Partial<UserPrivacy> = {}): UserPrivacy => ({
  userId,
  decided: true,
  noticeVersion: 2,
  current: true,
  decidedAt: 1_790_000_000,
  updatedAt: null,
  choices: CHOICES,
  effective: CHOICES,
  ...patch,
});

const directory = (users: UserPrivacy[]): PrivacyDirectory => ({
  currentNoticeVersion: 2,
  household: { ...CHOICES, visitorRecognition: false, watchman: false },
  householdUpdatedAt: null,
  visitorAcknowledgedAt: null,
  watchmanAcknowledgedAt: null,
  users,
});

describe('the minor mark on the wire', () => {
  test('the directory reads minor and guardianConsent, and an older answer reads as not a minor', () => {
    const base = {
      currentNoticeVersion: 2,
      household: { ...CHOICES, visitorRecognition: false },
      householdUpdatedAt: null,
      visitorAcknowledgedAt: null,
      users: [{ ...user(4), minor: true, guardianConsent: false }, user(5)],
    };
    const parsed = privacyDirectorySchema.parse(base);
    expect(parsed.users[0]).toMatchObject({ minor: true, guardianConsent: false });
    expect(parsed.users[1]).toMatchObject({ minor: false, guardianConsent: false });
  });

  test('the Owner marks a member at identity, Owner only', () => {
    expect(minorPath(4)).toBe('/privacy/users/4/minor');
  });
});

describe('what a mark changes', () => {
  test('a member is an adult, a protected minor or a minor with the guardian consent', () => {
    expect(minorStandingOf(minorMarkOf(user(4)))).toBe('adult');
    expect(minorStandingOf(minorMarkOf(user(4, { minor: true })))).toBe('minor-protected');
    expect(minorStandingOf(minorMarkOf(user(4, { minor: true, guardianConsent: true })))).toBe('minor-consented');
    expect(minorMarkOf(user(4, { minor: false, guardianConsent: true }))).toEqual({ minor: false, guardianConsent: false });
  });

  test('a consent never travels without the minor mark', () => {
    expect(normalizedMark({ minor: false, guardianConsent: true })).toEqual({ minor: false, guardianConsent: false });
  });

  test('each change is named, so the Owner confirms the right consequence', () => {
    const adult = { minor: false, guardianConsent: false };
    const protectedMinor = { minor: true, guardianConsent: false };
    const consented = { minor: true, guardianConsent: true };
    expect(minorChangeOf(adult, protectedMinor)).toBe('mark');
    expect(minorChangeOf(protectedMinor, adult)).toBe('unmark');
    expect(minorChangeOf(consented, adult)).toBe('unmark');
    expect(minorChangeOf(protectedMinor, consented)).toBe('consent');
    expect(minorChangeOf(consented, protectedMinor)).toBe('withdraw');
    expect(minorChangeOf(adult, adult)).toBeNull();
  });

  test('a protected minor shows face naming and voice learning off at once, until the server answers', () => {
    const before = directory([user(4), user(5)]);
    const after = withMinorMark(before, 4, { minor: true, guardianConsent: false });
    expect(after?.users[0]).toMatchObject({
      minor: true,
      guardianConsent: false,
      choices: CHOICES,
      effective: { ...CHOICES, faceCameras: false, voiceLearning: false },
    });
    expect(after?.users[1]).toBe(before.users[1]);
    expect(withMinorMark(null, 4, { minor: true, guardianConsent: false })).toBeNull();
  });
});

describe('the words the Owner reads', () => {
  test('both languages explain face naming and voice learning, and name the guardian', () => {
    for (const dictionary of [localeDictionaries.es, localeDictionaries.en]) {
      const text = (key: string, params?: Record<string, string>) =>
        translate(dictionary, key as never, params as never);
      expect(text('screens.privacy.minor.mark-description', { name: 'Lucía' })).toContain('Lucía');
      expect(text('screens.privacy.minor.consent-title', { name: 'Lucía' })).toContain('Lucía');
      expect(text('screens.privacy.minor.protected').length).toBeGreaterThan(20);
    }
  });

  test('the row lives in the Owner inspection of another member', () => {
    const screen = readFileSync(join(import.meta.dir, '../../../../src/features/people/screens/users-screen.tsx'), 'utf8');
    expect(screen).toContain("inspectedUser.id !== currentUserId && inspectedUser.role !== 'owner'");
    expect(screen).toContain('<MinorRow userId={Number(inspectedUser.id)} name={fullName(inspectedUser)} />');
  });
});
