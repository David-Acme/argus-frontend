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
  NetDiscovery,
  NetHttpFile,
  NetHttpRequest,
  NetHttpResult,
  NetPairing,
} from './ArgusNet.nitro';
