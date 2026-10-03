import type { VoiceprintChallenge, VoiceSampleCheck } from '@/core/types';
import { restartsEnrollment, sampleProblem, type VoiceprintProblem } from './voiceprint-problem';

export type PhraseState = 'pending' | 'recording' | 'checking' | 'accepted' | 'rejected';

export type EnrollmentPhase = 'consent' | 'starting' | 'phrases' | 'finishing' | 'done';

export interface EnrollmentState {
  phase: EnrollmentPhase;
  challenge: VoiceprintChallenge | null;
  current: number;
  phrases: readonly PhraseState[];
  problem: VoiceprintProblem | null;
}

export type EnrollmentEvent =
  | { type: 'start' }
  | { type: 'challenge'; challenge: VoiceprintChallenge }
  | { type: 'record' }
  | { type: 'check' }
  | { type: 'checked'; result: VoiceSampleCheck }
  | { type: 'failed'; problem: VoiceprintProblem }
  | { type: 'finish' }
  | { type: 'finished' }
  | { type: 'reset' };

export const INITIAL_ENROLLMENT: EnrollmentState = {
  phase: 'consent',
  challenge: null,
  current: 0,
  phrases: [],
  problem: null,
};

function withPhrase(state: EnrollmentState, next: PhraseState): readonly PhraseState[] {
  return state.phrases.map((phrase, index) => (index === state.current ? next : phrase));
}

function nextOpen(phrases: readonly PhraseState[], from: number): number {
  const after = phrases.findIndex((phrase, index) => index > from && phrase !== 'accepted');
  if (after >= 0) return after;
  const before = phrases.findIndex((phrase) => phrase !== 'accepted');
  return before >= 0 ? before : from;
}

function freshPhrases(state: EnrollmentState): EnrollmentState {
  return {
    ...state,
    phase: 'phrases',
    current: 0,
    phrases: state.phrases.map(() => 'pending'),
  };
}

function failure(state: EnrollmentState, problem: VoiceprintProblem): EnrollmentState {
  if (state.phase === 'starting' || restartsEnrollment(problem)) {
    return { ...INITIAL_ENROLLMENT, problem };
  }
  if (problem === 'inconsistent') return { ...freshPhrases(state), problem };
  if (state.phase === 'finishing') return { ...state, phase: 'phrases', problem };
  return { ...state, phrases: withPhrase(state, 'rejected'), problem };
}

export function enrollmentReducer(state: EnrollmentState, event: EnrollmentEvent): EnrollmentState {
  switch (event.type) {
    case 'start':
      return { ...state, phase: 'starting', problem: null };
    case 'challenge':
      return {
        phase: 'phrases',
        challenge: event.challenge,
        current: 0,
        phrases: event.challenge.phrases.map(() => 'pending'),
        problem: null,
      };
    case 'record':
      return { ...state, phrases: withPhrase(state, 'recording'), problem: null };
    case 'check':
      return { ...state, phrases: withPhrase(state, 'checking') };
    case 'checked': {
      if (!event.result.accepted) {
        return { ...state, phrases: withPhrase(state, 'rejected'), problem: sampleProblem(event.result.problem) };
      }
      const phrases = withPhrase(state, 'accepted');
      return { ...state, phrases, current: nextOpen(phrases, state.current), problem: null };
    }
    case 'failed':
      return failure(state, event.problem);
    case 'finish':
      return { ...state, phase: 'finishing', problem: null };
    case 'finished':
      return { ...state, phase: 'done', problem: null };
    case 'reset':
      return INITIAL_ENROLLMENT;
  }
}

export function readyToFinish(state: EnrollmentState): boolean {
  return state.phase === 'phrases' && state.phrases.length > 0 && state.phrases.every((phrase) => phrase === 'accepted');
}

export function isBusy(state: EnrollmentState): boolean {
  const phrase = state.phrases[state.current];
  return state.phase === 'starting' || state.phase === 'finishing' || phrase === 'checking';
}
