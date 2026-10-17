import type { DevicePermission, DevicePermissionId } from '@/core/types';

export type PermissionPlatform = 'android' | 'ios' | 'desktop' | 'browser';

export type PermissionPurpose = 'onboarding' | 'call';

const ORDER: readonly DevicePermissionId[] = ['microphone', 'notifications', 'full-screen', 'exact-alarms', 'background'];

const PURPOSES: Record<PermissionPurpose, readonly DevicePermissionId[]> = {
  onboarding: ORDER,
  call: ['microphone', 'notifications', 'full-screen', 'background'],
};

const PLATFORMS: Record<PermissionPlatform, readonly DevicePermissionId[]> = {
  android: ORDER,
  ios: ['microphone', 'notifications'],
  desktop: [],
  browser: [],
};

const RUNTIME: readonly DevicePermissionId[] = ['microphone', 'notifications'];

const ONLY_WHEN_MISSING: readonly DevicePermissionId[] = ['background'];

export function permissionsFor(platform: PermissionPlatform, purpose: PermissionPurpose): DevicePermissionId[] {
  return PURPOSES[purpose].filter((id) => PLATFORMS[platform].includes(id));
}

export function isRuntimePermission(id: DevicePermissionId): boolean {
  return RUNTIME.includes(id);
}

export function visiblePermissions(
  permissions: readonly DevicePermission[],
  purpose: PermissionPurpose,
): DevicePermission[] {
  return permissions.filter(
    ({ id, granted }) => !granted || (purpose === 'onboarding' && !ONLY_WHEN_MISSING.includes(id)),
  );
}

export function missingRuntime(permissions: readonly DevicePermission[]): DevicePermissionId[] {
  return permissions.filter(({ id, granted }) => !granted && isRuntimePermission(id)).map(({ id }) => id);
}
