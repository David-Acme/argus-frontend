import type { ICameraCacheRow } from '@/core/interfaces';
import type { UserRole } from '@/core/types';
import { peopleAccessForRole } from '@/shared/libs/people-access';

export type AppScreen = 'home' | 'agenda' | 'projects' | 'cameras' | 'security' | 'people' | 'settings';

const SCREEN_ROUTES: Readonly<Record<Exclude<AppScreen, 'people'>, string>> = {
  home: '/',
  agenda: '/agenda',
  projects: '/projects',
  cameras: '/cameras',
  security: '/security',
  settings: '/settings',
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
  if (!wanted && cameras.length === 1) return cameras[0].id;
  return null;
}

export function routeForScreen(screen: string, role: UserRole): string | null {
  if (screen === 'people') {
    const action = peopleAccessForRole(role).profileAction;
    if (action === 'manage') return '/users';
    if (action === 'directory') return '/people';
    return null;
  }
  if (screen === 'settings' && role !== 'owner') return null;
  return (SCREEN_ROUTES as Record<string, string>)[screen] ?? null;
}

export function detectedClasses(data: Record<string, unknown>): string[] {
  const objects = Array.isArray(data.objects) ? data.objects : [];
  const classes: string[] = [];
  for (const object of objects) {
    const name = typeof object === 'object' && object !== null ? (object as Record<string, unknown>).class : null;
    if (typeof name === 'string' && name && !classes.includes(name)) classes.push(name);
  }
  return classes;
}
