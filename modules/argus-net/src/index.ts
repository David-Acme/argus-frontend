import { NitroModules } from 'react-native-nitro-modules';

import type { ArgusNet } from './ArgusNet.nitro';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

export function createArgusNet(): ArgusNet {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<ArgusNet>('ArgusNet');
}

export type {
  ArgusNet,
  ArgusSocket,
  NetDiscovery,
  NetHttpFile,
  NetHttpRequest,
  NetHttpResult,
  NetPairing,
  NetSocketOptions,
} from './ArgusNet.nitro';
