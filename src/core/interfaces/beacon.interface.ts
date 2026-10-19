import type { BeaconStartConfig } from '@/core/types';

export interface IBeaconService {
  supported(): boolean;
  permissionGranted(): boolean;
  requestPermission(): Promise<boolean>;
  start(config: BeaconStartConfig): Promise<boolean>;
  stop(): void;
  running(): boolean;
}
