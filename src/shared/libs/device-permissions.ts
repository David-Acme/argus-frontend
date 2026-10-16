import type { DevicePermissionId } from '@/core/types';

export type PermissionPlatform = 'android' | 'ios' | 'desktop' | 'browser';

export type PermissionPurpose = 'onboarding' | 'call';

const PURPOSES: Record<PermissionPurpose, readonly DevicePermissionId[]> = {
  onboarding: ['notifications', 'background', 'full-screen', 'exact-alarms'],
  call: ['microphone', 'background', 'notifications', 'full-screen'],
};

const PLATFORMS: Record<PermissionPlatform, readonly DevicePermissionId[]> = {
  android: ['microphone', 'notifications', 'background', 'full-screen', 'exact-alarms'],
  ios: ['microphone', 'notifications'],
  desktop: [],
  browser: [],
};

export function permissionsFor(platform: PermissionPlatform, purpose: PermissionPurpose): DevicePermissionId[] {
  return PURPOSES[purpose].filter((id) => PLATFORMS[platform].includes(id));
}
