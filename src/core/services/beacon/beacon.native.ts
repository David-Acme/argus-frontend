import { createArgusBeacon, type ArgusBeacon } from 'argus-net';
import { PermissionsAndroid, Platform } from 'react-native';
import type { IBeaconService } from '@/core/interfaces';
import { log } from '@/core/services/log';
import type { BeaconStartConfig } from '@/core/types';
import { IS_ANDROID } from '@/shared/constants';

const ADVERTISE_PERMISSION_API = 31;

let instance: ArgusBeacon | null | undefined;

function beacon(): ArgusBeacon | null {
  if (instance !== undefined) return instance;
  try {
    instance = createArgusBeacon();
  } catch (reason) {
    log.error('beacon', 'the presence beacon is not in this build', reason);
    instance = null;
  }
  return instance;
}

const needsAdvertisePermission = (): boolean =>
  IS_ANDROID && typeof Platform.Version === 'number' && Platform.Version >= ADVERTISE_PERMISSION_API;

export const beaconService: IBeaconService = {
  supported: () => beacon()?.supported() ?? false,
  permissionGranted: () => beacon()?.permissionGranted() ?? false,
  async requestPermission() {
    if (!needsAdvertisePermission()) return true;
    const answer = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
    return answer === PermissionsAndroid.RESULTS.GRANTED;
  },
  async start(config: BeaconStartConfig) {
    const target = beacon();
    if (!target) return false;
    try {
      return await target.start(config);
    } catch (reason) {
      log.error('beacon', 'the presence beacon could not start', reason);
      return false;
    }
  },
  stop() {
    try {
      beacon()?.stop();
    } catch (reason) {
      log.error('beacon', 'the presence beacon could not stop', reason);
    }
  },
  running: () => beacon()?.running() ?? false,
};
