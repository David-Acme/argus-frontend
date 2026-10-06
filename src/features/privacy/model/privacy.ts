import { isJobOpen } from '@/core/services/modules/module-state';
import type {
  HouseholdPrivacy,
  ModuleCatalog,
  PrivacyChoices,
  PrivacyMe,
  PrivacySignal,
  PrivacyState,
} from '@/core/types';
import { PRIVACY_NOTICE_VERSION, PRIVACY_SIGNALS, PRIVACY_SIGNAL_MODULE } from '@/features/privacy/constants/privacy';

export const NO_CHOICES: PrivacyChoices = {
  presence: false,
  faceCameras: false,
  voiceLearning: false,
  cameraAudio: false,
};

export type PrivacyDecision = PrivacyChoices & { noticeVersion: number };

export function applicableSignals(
  applicable: PrivacyChoices | undefined,
  moduleActive: (moduleId: string) => boolean
): PrivacySignal[] {
  return PRIVACY_SIGNALS.filter(
    (signal) => (applicable?.[signal] ?? true) && moduleActive(PRIVACY_SIGNAL_MODULE[signal])
  );
}

export const signalsOfModules = (moduleIds: readonly string[]): PrivacySignal[] =>
  PRIVACY_SIGNALS.filter((signal) => moduleIds.includes(PRIVACY_SIGNAL_MODULE[signal]));

export function chosenModuleIds(catalog: ModuleCatalog | null): string[] {
  return (catalog?.modules ?? [])
    .filter((module) => module.kind !== 'core' && (module.enabled || (module.job?.kind === 'install' && isJobOpen(module.job))))
    .map((module) => module.id);
}

export const signalsToAsk = (catalog: ModuleCatalog | null): PrivacySignal[] =>
  signalsOfModules(chosenModuleIds(catalog));

export const coreSignals = (): PrivacySignal[] => signalsOfModules(['core']);

export function answeredChoices(
  stored: PrivacyChoices,
  asked: readonly PrivacySignal[],
  answers: PrivacyChoices
): PrivacyChoices {
  return Object.fromEntries(
    PRIVACY_SIGNALS.map((signal) => [signal, asked.includes(signal) ? answers[signal] : stored[signal]])
  ) as PrivacyChoices;
}

export const onlyCoreChoices = (choices: PrivacyChoices): PrivacyChoices =>
  answeredChoices(NO_CHOICES, coreSignals(), choices);

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
