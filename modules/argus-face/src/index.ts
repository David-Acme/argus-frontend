import { NitroModules } from 'react-native-nitro-modules';

import type { ArgusFace } from './ArgusFace.nitro';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

export function createArgusFace(): ArgusFace {
  const modules = NitroModules as unknown as NitroModulesProxyLike;
  return modules.createHybridObject<ArgusFace>('ArgusFace');
}

export type {
  ArgusFace,
  FaceBounds,
  FaceDetection,
  FaceLandmark,
} from './ArgusFace.nitro';