import { NitroModules } from 'react-native-nitro-modules';

import type { ArgusMic } from './ArgusMic.nitro';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

export function createMic(): ArgusMic {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<ArgusMic>('ArgusMic');
}

export type { ArgusMic } from './ArgusMic.nitro';