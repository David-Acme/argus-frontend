import { lazyScreen } from '@/shared/libs/lazy-screen';
export { CameraEnvironmentPanel } from './components/camera-environment-panel';
export { GuardCard } from './components/guard-card';
export {
  useCameraEnvironmentIndex,
  useGuardEnvironments,
  useGuardHeadline,
} from './hooks/use-guard';
export { matchEnvironment } from './model/environments';
export const CameraListScreen = lazyScreen(
  () => import('./screens/security-screens'),
  'CameraListScreen'
);
export const EnvironmentScreen = lazyScreen(
  () => import('./screens/security-screens'),
  'EnvironmentScreen'
);
export const EpisodesScreen = lazyScreen(
  () => import('./screens/security-screens'),
  'EpisodesScreen'
);
export const MaintenanceScreen = lazyScreen(
  () => import('./screens/security-screens'),
  'MaintenanceScreen'
);
export const PlacesScreen = lazyScreen(() => import('./screens/security-screens'), 'PlacesScreen');
export const SecurityScreen = lazyScreen(
  () => import('./screens/security-screens'),
  'SecurityScreen'
);
export const VisitsScreen = lazyScreen(() => import('./screens/security-screens'), 'VisitsScreen');
export { MaintenancePanel } from './components/maintenance-panel';
export { SightNoticeActions } from './components/sight-notice-actions';
export { useSightNotice } from './hooks/use-sight-notice';
export { SIGHT_NOTICE_KINDS, evidenceTargetOf, sightNoticeOf } from './model/tamper-notice';
export { useEpisodeFeed } from './hooks/use-episode-feed';
export { episodeTitle, needsReview } from './model/episode';
