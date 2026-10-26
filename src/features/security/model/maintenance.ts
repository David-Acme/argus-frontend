import type { MaintenanceDeclare, MaintenanceViewCheck, MaintenanceWindow } from '@/core/types';

export const MAINTENANCE_MINUTES: readonly number[] = [15, 30, 60, 120];
export const MAINTENANCE_DEFAULT_MINUTES = 15;
export const MAINTENANCE_MAX_MINUTES = 120;

export type MaintenanceScope =
  | { kind: 'cameras'; cameraIds: readonly number[] }
  | { kind: 'environment'; environmentId: number };

export function declareBody(scope: MaintenanceScope, minutes: number): MaintenanceDeclare | null {
  const bounded = Math.min(MAINTENANCE_MAX_MINUTES, Math.max(1, Math.round(minutes)));
  if (scope.kind === 'environment') {
    return scope.environmentId > 0 ? { environmentId: scope.environmentId, minutes: bounded } : null;
  }
  const cameraIds = [...new Set(scope.cameraIds.filter((id) => id > 0))];
  return cameraIds.length > 0 ? { cameraIds, minutes: bounded } : null;
}

export function sortWindows(windows: readonly MaintenanceWindow[]): MaintenanceWindow[] {
  return [...windows].sort((left, right) =>
    left.active === right.active ? right.startedAt - left.startedAt : left.active ? -1 : 1,
  );
}

export function activeWindowFor(windows: readonly MaintenanceWindow[], cameraId: number): MaintenanceWindow | null {
  return windows.find((window) => window.active && window.cameraIds.includes(cameraId)) ?? null;
}

export function replaceWindow(windows: readonly MaintenanceWindow[], next: MaintenanceWindow): MaintenanceWindow[] {
  return windows.some((window) => window.id === next.id)
    ? windows.map((window) => (window.id === next.id ? next : window))
    : [next, ...windows];
}

export function minutesLeft(window: Pick<MaintenanceWindow, 'endsAt'>, nowSeconds: number): number {
  return Math.max(0, Math.ceil((window.endsAt - nowSeconds) / 60));
}

export function pendingChecks(window: MaintenanceWindow, selfId: number): MaintenanceViewCheck[] {
  if (window.declaredBy !== selfId) return [];
  return window.viewChecks.filter((check) => check.state === 'pending');
}

export function cameraNames(
  window: Pick<MaintenanceWindow, 'cameraIds'>,
  names: ReadonlyMap<number, string>,
): string[] {
  return window.cameraIds.map((id) => names.get(id) ?? `#${id}`);
}
