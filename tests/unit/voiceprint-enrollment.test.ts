import { describe, expect, test } from 'bun:test';
import type { VoiceprintChallenge, VoiceSampleCheck } from '@/core/types';
import {
  enrollmentReducer,
  INITIAL_ENROLLMENT,
  isBusy,
  readyToFinish,
  type EnrollmentEvent,
  type EnrollmentState,
} from '@/features/voiceprint/model/enrollment';
import {
  problemOfError,
  problemOfRecorder,
  sampleProblem,
  VOICEPRINT_PROBLEM_KEYS,
} from '@/features/voiceprint/model/voiceprint-problem';
import { es } from '@/core/i18n/locales/es';
import { en } from '@/core/i18n/locales/en';

const CHALLENGE: VoiceprintChallenge = {
  challengeId: 'challenge',
  phrases: ['uno', 'dos', 'tres'],
  expiresAt: 0,
  lang: 'es',
  consentVersion: 'voiceprint-consent-v1',
  samplesRequired: 3,
  minSpeechSeconds: 1.2,
};

function check(accepted: boolean, problem: VoiceSampleCheck['problem'] = null): VoiceSampleCheck {
  return {
    accepted,
    problem,
    speechSeconds: 2,
    snrDb: 30,
    minSpeechSeconds: 1.2,
    minSnrDb: 12,
    collected: 0,
    required: 3,
  };
}

function run(events: EnrollmentEvent[], from: EnrollmentState = INITIAL_ENROLLMENT): EnrollmentState {
  return events.reduce(enrollmentReducer, from);
}

const STARTED: EnrollmentEvent[] = [{ type: 'start' }, { type: 'challenge', challenge: CHALLENGE }];
const TAKE: EnrollmentEvent[] = [{ type: 'record' }, { type: 'check' }];

describe('voice enrollment flow', () => {
  test('consent comes first, then one pending slot per phrase', () => {
    expect(INITIAL_ENROLLMENT.phase).toBe('consent');
    const state = run(STARTED);
    expect(state.phase).toBe('phrases');
    expect(state.phrases).toEqual(['pending', 'pending', 'pending']);
    expect(state.current).toBe(0);
  });

  test('an accepted phrase moves on; three accepted phrases are ready', () => {
    const accept: EnrollmentEvent[] = [...TAKE, { type: 'checked', result: check(true) }];
    const one = run([...STARTED, ...accept]);
    expect(one.phrases[0]).toBe('accepted');
    expect(one.current).toBe(1);
    expect(readyToFinish(one)).toBe(false);
    const all = run([...accept, ...accept], one);
    expect(readyToFinish(all)).toBe(true);
    expect(run([{ type: 'finish' }, { type: 'finished' }], all).phase).toBe('done');
  });

  test('a rejected phrase stays current with its reason until retaken', () => {
    const rejected = run([...STARTED, ...TAKE, { type: 'checked', result: check(false, 'too_noisy') }]);
    expect(rejected.current).toBe(0);
    expect(rejected.phrases[0]).toBe('rejected');
    expect(rejected.problem).toBe('too-noisy');
    const retaken = run([...TAKE, { type: 'checked', result: check(true) }], rejected);
    expect(retaken.problem).toBeNull();
    expect(retaken.current).toBe(1);
  });

  test('a mixed set starts the phrases over; an expired challenge starts from consent', () => {
    const accept: EnrollmentEvent[] = [...TAKE, { type: 'checked', result: check(true) }];
    const full = run([...STARTED, ...accept, ...accept, ...accept, { type: 'finish' }]);
    const mixed = enrollmentReducer(full, { type: 'failed', problem: 'inconsistent' });
    expect(mixed.phase).toBe('phrases');
    expect(mixed.phrases).toEqual(['pending', 'pending', 'pending']);
    expect(mixed.problem).toBe('inconsistent');
    const expired = enrollmentReducer(full, { type: 'failed', problem: 'expired' });
    expect(expired.phase).toBe('consent');
    expect(expired.problem).toBe('expired');
  });

  test('a challenge that could not be created returns to consent', () => {
    const state = run([{ type: 'start' }, { type: 'failed', problem: 'unavailable' }]);
    expect(state.phase).toBe('consent');
    expect(state.problem).toBe('unavailable');
  });

  test('checking and saving are busy; recording is not', () => {
    expect(isBusy(run([...STARTED, { type: 'record' }]))).toBe(false);
    expect(isBusy(run([...STARTED, ...TAKE]))).toBe(true);
    expect(isBusy(run([{ type: 'start' }]))).toBe(true);
  });
});

describe('voiceprint problems', () => {
  test('server refusals map by their catalog message', () => {
    expect(problemOfError({ code: 'BAD_REQUEST', message: 'The voice samples do not belong to one speaker' })).toBe(
      'inconsistent',
    );
    expect(problemOfError({ code: 'CONFLICT', message: 'This voice is already linked to another person' })).toBe(
      'taken',
    );
    expect(problemOfError({ code: 'NOT_FOUND', message: 'The voice enrollment challenge is invalid or expired' })).toBe(
      'expired',
    );
    expect(problemOfError({ code: 'SERVICE_UNAVAILABLE', message: 'anything' })).toBe('unavailable');
    expect(problemOfError({ code: 'NETWORK_ERROR', message: 'offline' })).toBe('generic');
    expect(problemOfError(null)).toBe('generic');
  });

  test('sample and recorder problems', () => {
    expect(sampleProblem('too_short')).toBe('too-short');
    expect(sampleProblem(null)).toBe('invalid');
    expect(problemOfRecorder(new Error('MIC_PERMISSION_DENIED|denied'))).toBe('permission');
    expect(problemOfRecorder(new Error('MIC_UNAVAILABLE|busy'))).toBe('microphone');
  });

  test('every problem has copy in both languages', () => {
    for (const key of Object.values(VOICEPRINT_PROBLEM_KEYS)) {
      const [, , group, name] = key.split('.');
      for (const locale of [es, en]) {
        const problems = locale.screens.voiceprint[group as 'problems'];
        expect(typeof problems[name as keyof typeof problems]).toBe('string');
      }
    }
  });
});
