import { NitroModules } from 'react-native-nitro-modules';

import type { ArgusPush } from './ArgusPush.nitro';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

export function createPush(): ArgusPush {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<ArgusPush>('ArgusPush');
}

export type { ArgusPush } from './ArgusPush.nitro';
