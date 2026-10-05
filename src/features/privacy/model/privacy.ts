import type { HouseholdPrivacy, PrivacyChoices, PrivacyMe, PrivacySignal, PrivacyState } from '@/core/types';
import { PRIVACY_NOTICE_VERSION, PRIVACY_SIGNALS } from '@/features/privacy/constants/privacy';

export const NO_CHOICES: PrivacyChoices = {
  presence: false,
  faceCameras: false,
  voiceLearning: false,
  cameraAudio: false,
};

export type PrivacyDecision = PrivacyChoices & { noticeVersion: number };

export function decisionOf(choices: PrivacyChoices): PrivacyDecision {
  return { noticeVersion: PRIVACY_NOTICE_VERSION, ...choices };
}

export function needsConsent(me: PrivacyMe | null): boolean {
  if (!me) return false;
  return !me.decided || !me.current || me.noticeVersion < PRIVACY_NOTICE_VERSION;
}

export function blockedByHousehold(household: PrivacyChoices, signal: PrivacySignal): boolean {
  return !household[signal];
}

export function withChoice(me: PrivacyMe, signal: PrivacySignal, value: boolean): PrivacyMe {
  const choices = { ...me.choices, [signal]: value };
  return {
    ...me,
    decided: true,
    current: true,
    noticeVersion: PRIVACY_NOTICE_VERSION,
    choices,
    effective: effectiveOf(choices, me.household),
  };
}

export function effectiveOf(choices: PrivacyChoices, household: PrivacyChoices): PrivacyChoices {
  return {
    presence: choices.presence && household.presence,
    faceCameras: choices.faceCameras && household.faceCameras,
    voiceLearning: choices.voiceLearning && household.voiceLearning,
    cameraAudio: choices.cameraAudio && household.cameraAudio,
  };
}

export function grantedCount(state: PrivacyState): number {
  return PRIVACY_SIGNALS.filter((signal) => state.choices[signal]).length;
}

export function cameraAudioHeldBy(states: readonly PrivacyState[], household: HouseholdPrivacy): number {
  if (!household.cameraAudio) return states.length;
  return states.filter((state) => !state.decided || !state.choices.cameraAudio).length;
}

let draft: PrivacyChoices | null = null;

export const consentDraft = {
  set(choices: PrivacyChoices) {
    draft = { ...choices };
  },
  peek(): PrivacyChoices | null {
    return draft ? { ...draft } : null;
  },
  take(): PrivacyChoices | null {
    const taken = draft;
    draft = null;
    return taken;
  },
};
