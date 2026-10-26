import { lazyScreen } from '@/shared/libs/lazy-screen';
export const CameraDetailScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraDetailScreen'
);
export const CamerasScreen = lazyScreen(() => import('./screens/camera-screens'), 'CamerasScreen');
export { CameraLiveView } from './components/camera-live-view';
export { CameraSnapshotView } from './components/camera-snapshot-view';
export { useCameraCounts, type CameraCounts } from './hooks/use-camera-counts';
export { useCameraOverview } from './hooks/use-camera-overview';
export { useCameraPrivacy } from './hooks/use-camera-privacy';
export const CameraLabScreen = lazyScreen(
  () => import('./screens/camera-screens'),
  'CameraLabScreen'
);
export { recordModeLabelKey } from './model/camera-record-mode';
export { TamperEvidenceView } from './components/tamper-evidence-view';
export { useTamperEvidenceKeeper } from './hooks/use-tamper-evidence';
export { useCameraThumbnails } from './hooks/use-camera-thumbnails';
export { useRecentClips, type RecentClips } from './hooks/use-recent-clips';
export { cameraMasked, cameraViews, type CameraView } from './model/camera-overview';
