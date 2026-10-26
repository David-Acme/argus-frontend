import { lazyScreen } from '@/shared/libs/lazy-screen';
export const ProfileScreen = lazyScreen(() => import('./screens/profile-screen'), 'default');
export const AppearanceScreen = lazyScreen(
  () => import('./screens/appearance-screen'),
  'AppearanceScreen'
);
export const LanguageScreen = lazyScreen(
  () => import('./screens/appearance-screen'),
  'LanguageScreen'
);
export const CallsScreen = lazyScreen(() => import('./screens/account-screens'), 'CallsScreen');
export const SafetyScreen = lazyScreen(() => import('./screens/account-screens'), 'SafetyScreen');
export const ProximityScreen = lazyScreen(
  () => import('./screens/account-screens'),
  'ProximityScreen'
);
export const ModuleRequestsScreen = lazyScreen(
  () => import('./screens/account-screens'),
  'ModuleRequestsScreen'
);
export { useAppearanceLine } from './hooks/use-appearance-line';
