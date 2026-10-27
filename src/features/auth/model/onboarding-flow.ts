import type { TranslationKey } from '@/core/types';

export type OnboardingFlowId = 'owner' | 'invited';

export type OnboardingStepId =
  | 'pair'
  | 'invitation'
  | 'privacy'
  | 'face'
  | 'name'
  | 'modules'
  | 'module-privacy'
  | 'permissions'
  | 'meet'
  | 'ready';

export type OnboardingContext = {
  native: boolean;
  moduleSignals?: boolean | null;
};

export type OnboardingScreen =
  | '/welcome/pairing'
  | '/welcome/invitation'
  | '/welcome/privacy'
  | '/welcome/face'
  | '/welcome/name'
  | '/welcome/modules'
  | '/welcome/module-privacy'
  | '/welcome/permissions'
  | '/welcome/voice'
  | '/welcome/ready';

export type OnboardingStep = {
  id: OnboardingStepId;
  screen: OnboardingScreen;
  label: TranslationKey;
  when: (context: OnboardingContext) => boolean;
  counted: boolean;
};

export type OnboardingHref = {
  pathname: OnboardingScreen;
  params: Record<string, string>;
};

export type OnboardingProgress = {
  current: number;
  total: number;
  label: TranslationKey;
};

const always = () => true;
const nativeOnly = (context: OnboardingContext) => context.native;
const nativeWithModuleSignals = (context: OnboardingContext) =>
  context.native && context.moduleSignals !== false;

type StepShape = {
  id: OnboardingStepId;
  screen: OnboardingScreen;
  counted: boolean;
  when?: (context: OnboardingContext) => boolean;
};

const step = ({ id, screen, counted, when = nativeOnly }: StepShape): OnboardingStep => ({
  id,
  screen,
  label: `screens.welcome.steps.${id}`,
  when,
  counted,
});

const STEP: Readonly<Record<OnboardingStepId, OnboardingStep>> = {
  pair: step({ id: 'pair', screen: '/welcome/pairing', counted: true, when: always }),
  invitation: step({ id: 'invitation', screen: '/welcome/invitation', counted: false }),
  privacy: step({ id: 'privacy', screen: '/welcome/privacy', counted: true }),
  face: step({ id: 'face', screen: '/welcome/face', counted: true }),
  name: step({ id: 'name', screen: '/welcome/name', counted: true }),
  modules: step({ id: 'modules', screen: '/welcome/modules', counted: true }),
  'module-privacy': step({
    id: 'module-privacy',
    screen: '/welcome/module-privacy',
    counted: true,
    when: nativeWithModuleSignals,
  }),
  permissions: step({ id: 'permissions', screen: '/welcome/permissions', counted: false }),
  meet: step({ id: 'meet', screen: '/welcome/voice', counted: false }),
  ready: step({ id: 'ready', screen: '/welcome/ready', counted: false }),
};

export const ONBOARDING_FLOWS: Readonly<Record<OnboardingFlowId, readonly OnboardingStep[]>> = {
  owner: [
    STEP.pair,
    STEP.privacy,
    STEP.face,
    STEP.name,
    STEP.modules,
    STEP['module-privacy'],
    STEP.permissions,
    STEP.meet,
    STEP.ready,
  ],
  invited: [
    STEP.invitation,
    STEP.privacy,
    STEP.face,
    STEP.name,
    STEP.permissions,
    STEP.meet,
    STEP.ready,
  ],
};

const ENROLL_MODE: Readonly<Record<OnboardingFlowId, string>> = {
  owner: 'owner-enroll',
  invited: 'invite-enroll',
};

const MODE_STEPS: ReadonlySet<OnboardingStepId> = new Set(['privacy', 'face']);

export function signalsKnownAt(flow: OnboardingFlowId, stepId: OnboardingStepId): boolean {
  const steps = ONBOARDING_FLOWS[flow];
  const known = steps.findIndex((step) => step.id === 'module-privacy');
  const at = steps.findIndex((step) => step.id === stepId);
  return known >= 0 && at >= known;
}

export function flowOf(params: { mode?: string; flow?: string }): OnboardingFlowId {
  if (params.flow === 'owner' || params.flow === 'invited') return params.flow;
  return params.mode === 'invite-enroll' ? 'invited' : 'owner';
}

export const enrollModeOf = (flow: OnboardingFlowId): string => ENROLL_MODE[flow];

export const stepsOf = (
  flow: OnboardingFlowId,
  context: OnboardingContext
): readonly OnboardingStep[] => ONBOARDING_FLOWS[flow].filter((step) => step.when(context));

export function progressOf(
  flow: OnboardingFlowId,
  stepId: OnboardingStepId,
  context: OnboardingContext
): OnboardingProgress | null {
  const counted = stepsOf(flow, context).filter((step) => step.counted);
  const index = counted.findIndex((step) => step.id === stepId);
  const step = counted[index];
  if (!step || counted.length < 2) return null;
  return { current: index + 1, total: counted.length, label: step.label };
}

export function hrefOf(flow: OnboardingFlowId, step: OnboardingStep): OnboardingHref {
  if (MODE_STEPS.has(step.id))
    return { pathname: step.screen, params: { mode: ENROLL_MODE[flow] } };
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
