import { NitroModules } from 'react-native-nitro-modules';

import type { ArgusBeacon } from './ArgusBeacon.nitro';
import type { ArgusNet } from './ArgusNet.nitro';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

export function createArgusNet(): ArgusNet {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<ArgusNet>('ArgusNet');
}

export function createArgusBeacon(): ArgusBeacon {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<ArgusBeacon>('ArgusBeacon');
}

export type { ArgusBeacon, BeaconConfig } from './ArgusBeacon.nitro';

export type {
  ArgusNet,
  ArgusSocket,
  NetDiscovery,
  NetHttpFile,
  NetHttpRequest,
  NetHttpResult,
  NetPairing,
  NetProbeResult,
  NetSocketOptions,
} from './ArgusNet.nitro';
