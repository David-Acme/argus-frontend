import { type HybridObject } from 'react-native-nitro-modules';

export interface BeaconConfig {
  seed: string;
  rotateSeconds: number;
  title: string;
  detail: string;
}

export interface ArgusBeacon extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  supported(): boolean;
  permissionGranted(): boolean;
  start(config: BeaconConfig): Promise<boolean>;
  stop(): void;
  running(): boolean;
}
