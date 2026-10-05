import type { MenuOption } from '@/core/types';

type ArrivalEnvironment = {
  id: number;
  name: string;
  cameraIds: readonly number[];
};

type ArrivalCamera = {
  id: string;
  name: string;
};

export type GuestArrival = {
  cameraId: number;
  environmentId: number;
};

export const ANY_ARRIVAL = '0';

export function guestArrivalOptions(
  environments: readonly ArrivalEnvironment[],
  cameras: readonly ArrivalCamera[]
): MenuOption[] {
  const names = new Map(cameras.map((camera) => [Number(camera.id), camera.name]));
  const several = environments.length > 1;
  return environments.flatMap((environment) =>
    environment.cameraIds
      .filter((cameraId) => names.has(cameraId))
      .map((cameraId) => ({
        value: String(cameraId),
        label: several ? `${names.get(cameraId)} · ${environment.name}` : (names.get(cameraId) ?? ''),
      }))
  );
}

export function guestArrival(
  value: string,
  environments: readonly ArrivalEnvironment[]
): GuestArrival | null {
  const cameraId = Number(value);
  if (!Number.isSafeInteger(cameraId) || cameraId <= 0) return null;
  const environment = environments.find((candidate) => candidate.cameraIds.includes(cameraId));
  return environment ? { cameraId, environmentId: environment.id } : null;
}
