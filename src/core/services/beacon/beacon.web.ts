import type { IBeaconService } from '@/core/interfaces';

export const beaconService: IBeaconService = {
  supported: () => false,
  permissionGranted: () => false,
  requestPermission: () => Promise.resolve(false),
  start: () => Promise.resolve(false),
  stop: () => undefined,
  running: () => false,
};
