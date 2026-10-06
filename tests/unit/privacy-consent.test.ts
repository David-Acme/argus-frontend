import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import type { ModuleCatalog, PrivacyMe } from '@/core/types';
import { moduleRecord } from './support/access-fixtures';
import { PRIVACY_JURISDICTIONS, PRIVACY_NOTICE_VERSION } from '@/features/privacy/constants/privacy';
import {
  NO_CHOICES,
  answeredChoices,
  applicableSignals,
  cameraAudioHeldBy,
  coreSignals,
  onlyCoreChoices,
  chosenModuleIds,
  signalsOfModules,
  signalsToAsk,
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

describe('privacy signals by module', () => {
  const surveillanceOn = (id: string) => id === 'core' || id === 'surveillance';
  const coreOnly = (id: string) => id === 'core';

  test('presence, recognition on cameras and camera audio belong to surveillance and voice to the core', () => {
    expect(coreSignals()).toEqual(['voiceLearning']);
    expect(signalsOfModules(['surveillance'])).toEqual(['presence', 'faceCameras', 'cameraAudio']);
    expect(signalsOfModules(['productivity'])).toEqual([]);
  });

  test('only the signals of active modules are asked, whatever the server flag says', () => {
    expect(applicableSignals(undefined, surveillanceOn)).toEqual(['presence', 'faceCameras', 'voiceLearning', 'cameraAudio']);
    expect(applicableSignals(undefined, coreOnly)).toEqual(['voiceLearning']);
    expect(applicableSignals({ ...ALL, presence: false }, surveillanceOn)).toEqual([
      'faceCameras',
      'voiceLearning',
      'cameraAudio',
    ]);
    expect(applicableSignals(ALL, coreOnly)).toEqual(['voiceLearning']);
  });

  test('a signal that is not applicable keeps its stored value when the others are answered', () => {
    const stored = { presence: true, faceCameras: false, voiceLearning: true, cameraAudio: true };
    const answers = { presence: false, faceCameras: true, voiceLearning: false, cameraAudio: false };
    expect(answeredChoices(stored, ['voiceLearning'], answers)).toEqual({
      presence: true,
      faceCameras: false,
      voiceLearning: false,
      cameraAudio: true,
    });
  });

  test('the first consent sends the surveillance signals off whatever the form held', () => {
    expect(onlyCoreChoices(ALL)).toEqual({ presence: false, faceCameras: false, voiceLearning: true, cameraAudio: false });
    expect(onlyCoreChoices(NO_CHOICES)).toEqual(NO_CHOICES);
  });

  test('the server flag is read when present and optional otherwise', () => {
    const me = {
      decided: true,
      noticeVersion: 1,
      current: true,
      decidedAt: 1,
      updatedAt: 1,
      choices: ALL,
      effective: ALL,
      currentNoticeVersion: 1,
      household: ALL,
    };
    expect(privacyMeSchema.safeParse(me).data?.applicable).toBeUndefined();
    const flagged = privacyMeSchema.safeParse({ ...me, applicable: { ...ALL, presence: false } });
    expect(flagged.data?.applicable?.presence).toBe(false);
    expect(flagged.data?.choices.presence).toBe(true);
  });
});

describe('what the owner is asked after choosing modules', () => {
  const catalog = (...modules: Parameters<typeof moduleRecord>[0][]): ModuleCatalog => ({
    fetchedAt: 1,
    modules: [moduleRecord({ id: 'core', kind: 'core', enabled: true }), ...modules.map((patch) => moduleRecord(patch))],
  });
  const installing = {
    id: '1',
    kind: 'install' as const,
    state: 'downloading' as const,
    progress: 0.1,
    bytesDone: 1,
    bytesTotal: 10,
    bytesPerSecond: 1,
    etaSeconds: null,
    reason: null,
    owner: null,
    roleMoves: [],
    roleMovesNote: null,
  };

  test('nothing when no module was chosen or the catalog is unknown', () => {
    expect(signalsToAsk(null)).toEqual([]);
    expect(signalsToAsk(catalog({ id: 'surveillance' }, { id: 'productivity' }))).toEqual([]);
  });

  test('the signals of a module that is on or being installed', () => {
    expect(signalsToAsk(catalog({ id: 'surveillance', enabled: true }))).toEqual(['presence', 'faceCameras', 'cameraAudio']);
    expect(signalsToAsk(catalog({ id: 'surveillance', job: installing }))).toEqual(['presence', 'faceCameras', 'cameraAudio']);
    expect(chosenModuleIds(catalog({ id: 'surveillance', job: installing }, { id: 'productivity', enabled: true }))).toEqual([
      'surveillance',
      'productivity',
    ]);
  });

  test('a module with no signals asks nothing and a removal in progress is not a choice', () => {
    expect(signalsToAsk(catalog({ id: 'productivity', enabled: true }))).toEqual([]);
    expect(signalsToAsk(catalog({ id: 'surveillance', job: { ...installing, kind: 'uninstall' } }))).toEqual([]);
  });
});
