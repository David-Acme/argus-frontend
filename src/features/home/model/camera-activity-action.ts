import { SCREEN_TITLE_KEYS } from '@/shared/constants';

export type CameraActivityAction = {
  labelKey: typeof SCREEN_TITLE_KEYS.cameras | 'screens.home.activity-action';
  href: '/cameras';
};

export function cameraActivityAction(noCameras: boolean): CameraActivityAction {
  return {
    labelKey: noCameras ? SCREEN_TITLE_KEYS.cameras : 'screens.home.activity-action',
    href: '/cameras',
  };
}
