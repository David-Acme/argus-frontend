import type { TranslationKey } from '@/core/types';

export type OnboardingFlowId = 'owner' | 'invited';

export type OnboardingStepId = 'pair' | 'invitation' | 'privacy' | 'face' | 'modules' | 'meet';

export type OnboardingContext = {
  native: boolean;
};

export type OnboardingScreen =
  | '/welcome/pairing'
  | '/welcome/invitation'
  | '/welcome/privacy'
  | '/welcome/face'
  | '/welcome/modules'
  | '/welcome/voice';

export type OnboardingStep = {
  id: OnboardingStepId;
  screen: OnboardingScreen;
  label: TranslationKey;
  when: (context: OnboardingContext) => boolean;
  skippable: boolean;
};

export type OnboardingHref = {
  pathname: OnboardingScreen;
  params: Record<string, string>;
};

export type OnboardingProgress = {
  current: number;
  total: number;
  steps: readonly OnboardingStep[];
};

const always = () => true;
const nativeOnly = (context: OnboardingContext) => context.native;

const STEP: Readonly<Record<OnboardingStepId, OnboardingStep>> = {
  pair: { id: 'pair', screen: '/welcome/pairing', label: 'screens.welcome.steps.pair', when: always, skippable: false },
  invitation: {
    id: 'invitation',
    screen: '/welcome/invitation',
    label: 'screens.welcome.steps.invitation',
    when: nativeOnly,
    skippable: false,
  },
  privacy: {
    id: 'privacy',
    screen: '/welcome/privacy',
    label: 'screens.welcome.steps.privacy',
    when: nativeOnly,
    skippable: false,
  },
  face: { id: 'face', screen: '/welcome/face', label: 'screens.welcome.steps.face', when: nativeOnly, skippable: false },
  modules: {
    id: 'modules',
    screen: '/welcome/modules',
    label: 'screens.welcome.steps.modules',
    when: nativeOnly,
    skippable: true,
  },
  meet: { id: 'meet', screen: '/welcome/voice', label: 'screens.welcome.steps.meet', when: nativeOnly, skippable: true },
};

export const ONBOARDING_FLOWS: Readonly<Record<OnboardingFlowId, readonly OnboardingStep[]>> = {
  owner: [STEP.pair, STEP.privacy, STEP.face, STEP.modules, STEP.meet],
  invited: [STEP.invitation, STEP.privacy, STEP.face, STEP.meet],
};

const ENROLL_MODE: Readonly<Record<OnboardingFlowId, string>> = {
  owner: 'owner-enroll',
  invited: 'invite-enroll',
};

export function flowOf(params: { mode?: string; flow?: string }): OnboardingFlowId {
  if (params.flow === 'owner' || params.flow === 'invited') return params.flow;
  return params.mode === 'invite-enroll' ? 'invited' : 'owner';
}

export const enrollModeOf = (flow: OnboardingFlowId): string => ENROLL_MODE[flow];

export const stepsOf = (flow: OnboardingFlowId, context: OnboardingContext): readonly OnboardingStep[] =>
  ONBOARDING_FLOWS[flow].filter((step) => step.when(context));

export function progressOf(
  flow: OnboardingFlowId,
  stepId: OnboardingStepId,
  context: OnboardingContext
): OnboardingProgress | null {
  const steps = stepsOf(flow, context);
  const index = steps.findIndex((step) => step.id === stepId);
  if (index < 0 || steps.length < 2) return null;
  return { current: index + 1, total: steps.length, steps };
}

export function hrefOf(flow: OnboardingFlowId, step: OnboardingStep): OnboardingHref {
  if (step.id === 'privacy' || step.id === 'face') {
    return { pathname: step.screen, params: { mode: ENROLL_MODE[flow] } };
  }
  return { pathname: step.screen, params: { flow } };
}

export function nextHref(
  flow: OnboardingFlowId,
  stepId: OnboardingStepId,
  context: OnboardingContext
): OnboardingHref | null {
  const steps = stepsOf(flow, context);
  const index = steps.findIndex((step) => step.id === stepId);
  const next = index < 0 ? undefined : steps[index + 1];
  return next ? hrefOf(flow, next) : null;
}

export function isSkippable(flow: OnboardingFlowId, stepId: OnboardingStepId): boolean {
  return ONBOARDING_FLOWS[flow].some((step) => step.id === stepId && step.skippable);
}
