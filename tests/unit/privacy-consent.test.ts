import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import type { PrivacyMe } from '@/core/types';
import { PRIVACY_JURISDICTIONS, PRIVACY_NOTICE_VERSION } from '@/features/privacy/constants/privacy';
import {
  NO_CHOICES,
  cameraAudioHeldBy,
  consentDraft,
  decisionOf,
  effectiveOf,
  needsConsent,
  withChoice,
} from '@/features/privacy/model/privacy';

const backend = join(import.meta.dir, '../../../backend');

const ALL = { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true };

function withoutHousehold(me: PrivacyMe) {
  const { household: _household, currentNoticeVersion: _version, ...state } = me;
  return state;
}

const undecided: PrivacyMe = {
  decided: false,
  noticeVersion: 0,
  current: false,
  decidedAt: null,
  updatedAt: null,
  choices: NO_CHOICES,
  effective: NO_CHOICES,
  currentNoticeVersion: 1,
  household: ALL,
};

describe('privacy consent model', () => {
  test('the app notice version is the one identity enforces', () => {
    const header = readFileSync(
      join(backend, 'services/identity/src/shared/vocabulary/privacy-choices.hxx'),
      'utf8'
    );
    expect(header).toContain(`kPrivacyNoticeVersion = ${PRIVACY_NOTICE_VERSION};`);
  });

  test('the jurisdiction table matches the host notice table', () => {
    const row = readFileSync(join(backend, 'scripts/privacy/jurisdictions.tsv'), 'utf8')
      .split('\n')
      .find((line) => line.startsWith('pe\t'))
      ?.split('\t');
    expect(row?.slice(7).map(Number)).toEqual([
      PRIVACY_JURISDICTIONS.pe.videoDays,
      PRIVACY_JURISDICTIONS.pe.videoMaxDays,
      PRIVACY_JURISDICTIONS.pe.incidentDays,
    ]);
  });

  test('an undecided person or an older notice asks again; nothing loaded asks nothing', () => {
    expect(needsConsent(null)).toBe(false);
    expect(needsConsent(undecided)).toBe(true);
    const decided = withChoice(undecided, 'presence', true);
    expect(needsConsent(decided)).toBe(false);
    expect(needsConsent({ ...decided, current: false })).toBe(true);
  });

  test('a choice is effective only while the household allows it', () => {
    const household = { ...ALL, voiceLearning: false };
    expect(effectiveOf(ALL, household)).toEqual(household);
    const me = withChoice({ ...undecided, household }, 'voiceLearning', true);
    expect(me.choices.voiceLearning).toBe(true);
    expect(me.effective.voiceLearning).toBe(false);
  });

  test('the decision carries every signal and the notice version', () => {
    expect(decisionOf(NO_CHOICES)).toEqual({ noticeVersion: PRIVACY_NOTICE_VERSION, ...NO_CHOICES });
  });

  test('camera audio is held by every person who has not said yes', () => {
    const yes = { ...withChoice(undecided, 'cameraAudio', true) };
    const no = withChoice(undecided, 'presence', true);
    expect(cameraAudioHeldBy([yes, yes], { ...ALL, visitorRecognition: false })).toBe(0);
    expect(cameraAudioHeldBy([yes, no, undecided], { ...ALL, visitorRecognition: false })).toBe(2);
    expect(cameraAudioHeldBy([yes], { ...ALL, cameraAudio: false, visitorRecognition: false })).toBe(1);
  });

  test('the onboarding draft is kept until it is taken', () => {
    consentDraft.set({ ...NO_CHOICES, presence: true });
    expect(consentDraft.peek()?.presence).toBe(true);
    expect(consentDraft.take()?.presence).toBe(true);
    expect(consentDraft.peek()).toBeNull();
  });

  test('the contracts read what identity answers', () => {
    expect(
      privacyMeSchema.safeParse({ ...undecided, current: false, decidedAt: null, updatedAt: null }).success
    ).toBe(true);
    expect(
      privacyDirectorySchema.safeParse({
        currentNoticeVersion: 1,
        household: { ...ALL, visitorRecognition: false },
        householdUpdatedAt: null,
        visitorAcknowledgedAt: null,
        users: [{ ...withoutHousehold(undecided), userId: 7 }],
      }).success
    ).toBe(true);
    expect(privacyMeSchema.safeParse({ ...undecided, household: {} }).success).toBe(false);
  });
});
