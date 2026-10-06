import type { ICameraCacheRow } from '@/core/interfaces';
import { peopleAccessOf, type AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';

export type AppScreen = 'home' | 'agenda' | 'projects' | 'cameras' | 'security' | 'people' | 'settings' | 'modules';

const SCREEN_ROUTES: Readonly<Record<Exclude<AppScreen, 'people'>, string>> = {
  home: '/',
  agenda: '/agenda',
  projects: '/projects',
  cameras: '/cameras',
  security: '/security',
  settings: '/settings',
  modules: '/settings/modules',
};

const normalized = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

type ResolveCameraInput = {
  requested: string;
  cameras: readonly Pick<ICameraCacheRow, 'id' | 'name'>[];
  lastEventCameraId: string | null;
};

export function resolveCameraId({ requested, cameras, lastEventCameraId }: ResolveCameraInput): string | null {
  const wanted = normalized(requested);
  if (wanted) {
    const exact = cameras.find((camera) => normalized(camera.name) === wanted);
    if (exact) return exact.id;
    const partial = cameras.find((camera) => {
      const name = normalized(camera.name);
      return name.includes(wanted) || wanted.includes(name);
    });
    if (partial) return partial.id;
    const words = wanted.split(/\s+/).filter((word) => word.length >= 4);
    const byWord = cameras.find((camera) => normalized(camera.name).split(/\s+/).some((word) => words.includes(word)));
    if (byWord) return byWord.id;
  }
  if (lastEventCameraId && cameras.some((camera) => camera.id === lastEventCameraId)) return lastEventCameraId;
  const [only] = cameras;
  if (!wanted && only && cameras.length === 1) return only.id;
  return null;
}

const peopleRoute = (view: AccessView): string | null => {
  const action = peopleAccessOf(view).profileAction;
  if (action === 'manage') return '/users';
  return action === 'directory' ? '/people' : null;
};

const MODULE_ID = /^[a-z0-9-]+$/;

export function routeForScreen(screen: string, view: AccessView, moduleId?: string): string | null {
  const route = screen === 'people' ? peopleRoute(view) : ((SCREEN_ROUTES as Record<string, string>)[screen] ?? null);
  if (route === null || routeFallback(route, view) !== null) return null;
  return screen === 'modules' && moduleId && MODULE_ID.test(moduleId) ? `${route}?module=${moduleId}` : route;
}

export const cameraViewOf = (value: unknown): 'live' | 'snapshot' => (value === 'snapshot' ? 'snapshot' : 'live');

export function detectedClasses(data: Record<string, unknown>): string[] {
  const objects = Array.isArray(data.objects) ? data.objects : [];
  const classes: string[] = [];
  for (const object of objects) {
    const name = typeof object === 'object' && object !== null ? (object as Record<string, unknown>).class : null;
    if (typeof name === 'string' && name && !classes.includes(name)) classes.push(name);
  }
  return classes;
}

const SPOKEN_KINDS: ReadonlySet<string> = new Set(['guard_episode', 'guard_tamper', 'camera_fallback']);
const PASSIVE_KINDS: ReadonlySet<string> = new Set(['guard_digest']);

export type CallCameraEvent = {
  cameraId: string | null;
  camera: string;
  guardCopy: string | null;
};

type CameraEventInput = {
  type: string;
  body: string;
  data: Record<string, unknown> | null | undefined;
  cameras: readonly Pick<ICameraCacheRow, 'id' | 'name'>[];
};

export function callCameraEvent({ type, body, data, cameras }: CameraEventInput): CallCameraEvent | null {
  if (type !== 'camera' || !data) return null;
  const rawId = data.cameraId;
  const cameraId = typeof rawId === 'number' || (typeof rawId === 'string' && rawId) ? String(rawId) : null;
  const named = typeof data.cameraName === 'string' ? data.cameraName.trim() : '';
  const camera = named || cameras.find((row) => row.id === cameraId)?.name || '';
  if (!camera) return null;
  const kind = typeof data.kind === 'string' ? data.kind : '';
  if (PASSIVE_KINDS.has(kind)) return null;
  const copy = body.trim();
  return { cameraId, camera, guardCopy: SPOKEN_KINDS.has(kind) && copy ? copy : null };
}
