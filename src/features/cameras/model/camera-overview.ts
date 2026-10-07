import type { ICameraCacheRow, ICameraDetection, ICameraOverview, ICameraOverviewRow } from '@/core/interfaces';
import type { CameraHealthState, TranslateFn, TranslationKey } from '@/core/types';

export type CameraStatus = 'online' | 'offline' | 'disabled';

export type CameraStatusFilter = 'all' | CameraStatus;

export type CameraSort = 'name' | 'status' | 'activity';

export type CameraDensity = 'grid' | 'list';

export type CameraView = {
  camera: ICameraCacheRow;
  status: CameraStatus;
  live: ICameraOverviewRow | null;
  lastEvent: ICameraDetection | null;
};

export type CameraCounts = Record<CameraStatusFilter, number>;

export type RelativeTime = {
  unit: 'now' | 'minutes' | 'hours' | 'days';
  count: number;
};

const STATUS_ORDER: Record<CameraStatus, number> = { offline: 0, online: 1, disabled: 2 };

const HEALTH_STATES: readonly CameraHealthState[] = [
  'ok',
  'dark',
  'bright',
  'blurred',
  'moved',
  'covered',
  'unreachable',
  'unknown',
];

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

export function healthOf(live: ICameraOverviewRow | null): CameraHealthState {
  const value = live?.health as CameraHealthState | undefined;
  return value && HEALTH_STATES.includes(value) ? value : 'unknown';
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

export type LivePreviewBudget = {
  budget: number;
  isPending: (camera: ICameraCacheRow) => boolean;
};

export function livePreviewIds(views: readonly CameraView[], { budget, isPending }: LivePreviewBudget): ReadonlySet<string> {
  const ids: string[] = [];
  for (const view of views) {
    if (ids.length >= budget) break;
    if (view.status === 'online' && !isPending(view.camera)) ids.push(view.camera.id);
  }
  return new Set(ids);
}

export function countViews(views: readonly CameraView[]): CameraCounts {
  const counts: CameraCounts = { all: views.length, online: 0, offline: 0, disabled: 0 };
  for (const view of views) counts[view.status] += 1;
  return counts;
}

function matchesQuery(view: CameraView, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const { camera } = view;
  return [camera.name, camera.modelLabel, camera.ip].some((text) => text.toLowerCase().includes(needle));
}

export function selectViews(
  views: readonly CameraView[],
  { query, status, sort }: { query: string; status: CameraStatusFilter; sort: CameraSort },
): CameraView[] {
  const visible = views.filter((view) => (status === 'all' || view.status === status) && matchesQuery(view, query));
  const byName = (left: CameraView, right: CameraView) =>
    left.camera.name.localeCompare(right.camera.name, undefined, { sensitivity: 'base' });
  return [...visible].sort((left, right) => {
    if (sort === 'status') return STATUS_ORDER[left.status] - STATUS_ORDER[right.status] || byName(left, right);
    if (sort === 'activity') return (right.lastEvent?.at ?? 0) - (left.lastEvent?.at ?? 0) || byName(left, right);
    return byName(left, right);
  });
}

export function relativeTime(at: number, now: number): RelativeTime | null {
  if (at <= 0) return null;
  const minutes = Math.floor(Math.max(0, now - at) / 60000);
  if (minutes < 1) return { unit: 'now', count: 0 };
  if (minutes < 60) return { unit: 'minutes', count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hours', count: hours };
  return { unit: 'days', count: Math.floor(hours / 24) };
}

export function formatRelative(t: TranslateFn, time: RelativeTime | null): string {
  if (!time) return '';
  const count = String(time.count);
  if (time.unit === 'now') return t('screens.cameras.time.now');
  if (time.unit === 'minutes') return t('screens.cameras.time.minutes', { count });
  if (time.unit === 'hours') return t('screens.cameras.time.hours', { count });
  return t('screens.cameras.time.days', { count });
}

export function streamSummary(live: ICameraOverviewRow | null): string {
  const stream = live?.stream;
  if (!stream) return '';
  const parts: string[] = [];
  if (stream.width > 0 && stream.height > 0) parts.push(`${stream.width}×${stream.height}`);
  if (stream.fps > 0) parts.push(`${Math.round(stream.fps)} fps`);
  if (stream.kbps > 0) parts.push(stream.kbps >= 1000 ? `${(stream.kbps / 1000).toFixed(1)} Mbps` : `${stream.kbps} kbps`);
  return parts.join(' · ');
}

const MIN_TILE_WIDTH = 260;
const GRID_GAP = 16;
const MAX_COLUMNS = 5;

export function gridColumns(width: number, count: number): number {
  const fit = Math.max(1, Math.min(MAX_COLUMNS, Math.floor((width + GRID_GAP) / (MIN_TILE_WIDTH + GRID_GAP))));
  const most = Math.max(1, Math.min(fit, count));
  let best = most;
  let bestEmpty = (most - (count % most)) % most;
  for (let columns = most - 1; columns >= Math.max(1, most - 1); columns -= 1) {
    const empty = (columns - (count % columns)) % columns;
    if (empty < bestEmpty) {
      best = columns;
      bestEmpty = empty;
    }
  }
  return best;
}
