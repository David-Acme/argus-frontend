import type { ICameraCacheRow, ICameraDetection, ICameraOverview, ICameraOverviewRow } from '@/core/interfaces';
import type { CameraPrivacyState, TranslationKey } from '@/core/types';

export type CameraStatus = 'online' | 'offline' | 'disabled';

export type CameraView = {
  camera: ICameraCacheRow;
  status: CameraStatus;
  live: ICameraOverviewRow | null;
  lastEvent: ICameraDetection | null;
};

const OBJECT_LABEL: Record<string, TranslationKey> = {
  person: 'screens.cameras.objects.person',
  car: 'screens.cameras.objects.car',
  truck: 'screens.cameras.objects.truck',
  bus: 'screens.cameras.objects.truck',
  motorcycle: 'screens.cameras.objects.motorcycle',
  bicycle: 'screens.cameras.objects.bicycle',
  dog: 'screens.cameras.objects.animal',
  cat: 'screens.cameras.objects.animal',
  bird: 'screens.cameras.objects.animal',
  horse: 'screens.cameras.objects.animal',
};

export function cameraStatusOf(camera: Pick<ICameraCacheRow, 'isEnabled' | 'isOnline'>): CameraStatus {
  if (!camera.isEnabled) return 'disabled';
  return camera.isOnline ? 'online' : 'offline';
}

export function privacyOf(view: Pick<CameraView, 'camera' | 'live'>): CameraPrivacyState {
  if (view.camera.privacyState === 'on' || view.live?.privacyState === 'on') return 'on';
  if (view.camera.privacyState === 'off' || view.live?.privacyState === 'off') return 'off';
  return 'unknown';
}

export function privacyUnconfirmed(view: Pick<CameraView, 'camera' | 'live'>): boolean {
  return privacyOf(view) === 'unknown' && (view.camera.privacyObeyed || view.live?.privacyObeyed === true);
}

export function cameraMasked(view: Pick<CameraView, 'camera' | 'live'>): boolean {
  return privacyOf(view) === 'on' || privacyUnconfirmed(view);
}

export function objectLabelKey(label: string): TranslationKey {
  return OBJECT_LABEL[label] ?? 'screens.cameras.objects.other';
}

export function cameraViews(
  cameras: readonly ICameraCacheRow[],
  overview: ICameraOverview | null,
): CameraView[] {
  const live = new Map((overview?.cameras ?? []).map((row) => [String(row.id), row]));
  const lastEvents = new Map<string, ICameraDetection>();
  for (const event of overview?.events ?? []) {
    const key = String(event.cameraId);
    const known = lastEvents.get(key);
    if (!known || known.at < event.at) lastEvents.set(key, event);
  }
  return cameras.map((camera) => {
    const row = live.get(camera.id) ?? null;
    return {
      camera,
      status: cameraStatusOf(camera),
      live: row,
      lastEvent: row?.lastEvent ?? lastEvents.get(camera.id) ?? null,
    };
  });
}
