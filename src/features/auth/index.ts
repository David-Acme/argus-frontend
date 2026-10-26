import { lazyScreen } from '@/shared/libs/lazy-screen';
export { EntryGate } from './components/entry-gate';
export { SessionGate } from './components/session-gate';
export const ApproveScreen = lazyScreen(() => import('./screens/approve-screen'), 'default');
export const FaceScreen = lazyScreen(() => import('./screens/face-screen'), 'default');
export const InvitationScreen = lazyScreen(() => import('./screens/invitation-screen'), 'default');
export const LoginScreen = lazyScreen(() => import('./screens/login-screen'), 'default');
export const OnboardingCallScreen = lazyScreen(
  () => import('./screens/onboarding-call-screen'),
  'default'
);
export const PairingScreen = lazyScreen(() => import('./screens/pairing-screen'), 'default');
export const PrivacyScreen = lazyScreen(() => import('./screens/privacy-screen'), 'default');
export { default as WelcomeScreen } from './screens/welcome-screen';
export const OnboardingModulesScreen = lazyScreen(
  () => import('./screens/onboarding-modules-screen'),
  'default'
);
export const OnboardingModulePrivacyScreen = lazyScreen(
  () => import('./screens/onboarding-module-privacy-screen'),
  'default'
);
export const OnboardingPermissionsScreen = lazyScreen(
  () => import('./screens/onboarding-permissions-screen'),
  'default'
);
export { useSignedInHistory } from './hooks/use-signed-in-history';
export { useDeepLinkRestore } from './hooks/use-deep-link-restore';
