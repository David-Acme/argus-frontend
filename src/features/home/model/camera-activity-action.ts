export type CameraActivityAction = {
  labelKey: 'screens.cameras.title' | 'screens.home.activity-action';
  href: '/cameras';
};

export function cameraActivityAction(noCameras: boolean): CameraActivityAction {
  return {
    labelKey: noCameras ? 'screens.cameras.title' : 'screens.home.activity-action',
    href: '/cameras',
  };
}
