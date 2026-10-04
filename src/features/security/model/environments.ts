import type {
  CameraEnvironmentBadge,
  EnvironmentMatch,
  GuardEnvironment,
  GuardEnvironmentKind,
  GuardMode,
} from '@/core/types';

const KIND_WORDS: Readonly<Record<GuardEnvironmentKind, readonly string[]>> = {
  home: ['casa', 'hogar', 'piso', 'departamento', 'home', 'house'],
  office: ['oficina', 'despacho', 'office'],
  commercial: ['local', 'tienda', 'negocio', 'shop', 'store'],
  restaurant: ['restaurante', 'restaurant', 'bar', 'cafeteria'],
  warehouse: ['almacen', 'bodega', 'nave', 'taller', 'warehouse'],
  outdoor: ['exterior', 'finca', 'campo', 'parking', 'outdoor', 'yard'],
};

const PLACE_WORDS: ReadonlySet<string> = new Set(Object.values(KIND_WORDS).flat());

export function foldWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

export function defaultEnvironment(environments: readonly GuardEnvironment[]): GuardEnvironment | null {
  return environments.find((environment) => environment.isDefault) ?? environments[0] ?? null;
}

export function environmentForCamera(
  environments: readonly GuardEnvironment[],
  cameraId: number | string
): GuardEnvironment | null {
  const id = Number(cameraId);
  return (
    environments.find((environment) => environment.cameraIds.includes(id)) ?? defaultEnvironment(environments)
  );
}

export function camerasIn<T extends { id: string }>(
  environment: GuardEnvironment,
  environments: readonly GuardEnvironment[],
  cameras: readonly T[]
): T[] {
  return cameras.filter((camera) => environmentForCamera(environments, camera.id)?.id === environment.id);
}

export function cameraEnvironmentIndex(
  environments: readonly GuardEnvironment[],
  cameraIds: readonly string[]
): ReadonlyMap<string, CameraEnvironmentBadge> {
  const index = new Map<string, CameraEnvironmentBadge>();
  const several = environments.length > 1;
  for (const cameraId of cameraIds) {
    const environment = environmentForCamera(environments, cameraId);
    if (!environment) continue;
    index.set(cameraId, {
      environmentId: environment.id,
      name: environment.name,
      kind: environment.kind,
      mode: environment.mode,
      effectiveMode: environment.effectiveMode,
      armed: environment.effectiveMode === 'armed' || environment.effectiveMode === 'away',
      several,
    });
  }
  return index;
}

export function withMode(
  environments: readonly GuardEnvironment[],
  mode: GuardMode,
  environmentId?: number
): GuardEnvironment[] {
  return environments.map((environment) => {
    if (environmentId !== undefined && environment.id !== environmentId) return environment;
    const follows = !environment.scheduleEnabled || environment.occupancy === 'manual' || mode === 'armed';
    return {
      ...environment,
      mode,
      effectiveMode: follows ? mode : environment.effectiveMode,
      occupancy: mode === 'armed' && environment.scheduleEnabled ? 'armed' : environment.occupancy,
    };
  });
}

export function withCameraIn(
  environments: readonly GuardEnvironment[],
  cameraId: number,
  environmentId: number
): GuardEnvironment[] {
  return environments.map((environment) => {
    const others = environment.cameraIds.filter((id) => id !== cameraId);
    return environment.id === environmentId
      ? { ...environment, cameraIds: [...others, cameraId].sort((a, b) => a - b) }
      : others.length === environment.cameraIds.length
        ? environment
        : { ...environment, cameraIds: others };
  });
}

export function sharedMode(environments: readonly GuardEnvironment[]): GuardMode | null {
  const first = environments[0];
  if (!first) return null;
  return environments.every((environment) => environment.mode === first.mode) ? first.mode : null;
}

export function matchEnvironment(environments: readonly GuardEnvironment[], hint: string): EnvironmentMatch {
  const words = foldWords(hint).filter((word) => word.length >= 3);
  if (environments.length <= 1 || words.length === 0) return { kind: 'all' };
  const spoken = foldWords(hint).join(' ');
  const exact = environments.find((environment) => foldWords(environment.name).join(' ') === spoken);
  if (exact) return { kind: 'one', environment: exact };
  const scored = environments
    .map((environment) => {
      const name = foldWords(environment.name);
      const kind = KIND_WORDS[environment.kind];
      const score = words.reduce(
        (total, word) =>
          total + (name.some((part) => part === word || part.startsWith(word)) ? 2 : kind.includes(word) ? 1 : 0),
        0
      );
      return { environment, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  const [best, second] = scored;
  if (best && (!second || best.score > second.score)) return { kind: 'one', environment: best.environment };
  if (best) return { kind: 'unknown' };
  return words.some((word) => PLACE_WORDS.has(word)) ? { kind: 'unknown' } : { kind: 'all' };
}

export type PostureKey =
  | 'short-open'
  | 'short-staffed'
  | 'short-closed'
  | 'short-asleep'
  | 'short-armed'
  | 'short-manual';

export function postureKey(environment: GuardEnvironment): PostureKey {
  switch (environment.occupancy) {
    case 'open':
      return 'short-open';
    case 'staffed':
      return 'short-staffed';
    case 'closed':
      return 'short-closed';
    case 'asleep':
      return 'short-asleep';
    case 'armed':
      return 'short-armed';
    default:
      return 'short-manual';
  }
}
