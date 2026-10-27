import { lazyScreen } from '@/shared/libs/lazy-screen';
import { useClipsWarm } from './hooks/use-clips-warm';
export const CameraLiveScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraLiveScreen'
);
export const CameraRecordingsScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraRecordingsScreen'
);
export const CameraSettingsScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraSettingsScreen'
);
export const CameraZonesScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraZonesScreen'
);
export { CameraLiveView } from './components/camera-live-view';
export { CameraSnapshotView } from './components/camera-snapshot-view';
export { CameraPreview } from './components/camera-preview';
export { useCameraCounts, type CameraCounts } from './hooks/use-camera-counts';
export { useCameraOverview } from './hooks/use-camera-overview';
export { useCameraPrivacy } from './hooks/use-camera-privacy';
export const ClipsScreen = lazyScreen(() => import('./screens/camera-screens'), 'ClipsScreen');
export const ClipScreen = lazyScreen(() => import('./screens/camera-screens'), 'ClipScreen');

const preloadClipScreens = async (): Promise<void> => {
  await Promise.all([ClipsScreen.preload(), ClipScreen.preload()]);
};

export function useClipsRuntime(): void {
  useClipsWarm({ preload: preloadClipScreens });
}
export const CameraLabScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraLabScreen'
);
export { recordModeLabelKey } from './model/camera-record-mode';
export { TamperEvidenceView } from './components/tamper-evidence-view';
export { useTamperEvidenceKeeper } from './hooks/use-tamper-evidence';
export { useCameraThumbnails } from './hooks/use-camera-thumbnails';
export { useCameraStill } from './hooks/use-camera-still';
export { RecentClipsCard } from './components/clips/recent-clips-card';
export {
  cameraMasked,
  cameraViews,
  objectLabelKey,
  type CameraView,
} from './model/camera-overview';
export { CameraForm } from './components/camera-form';
