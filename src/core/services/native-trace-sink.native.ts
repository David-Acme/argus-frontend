import { NitroModules } from 'react-native-nitro-modules';
import type { IArgusPushNative } from '@/core/interfaces';
import { installTraceSink } from './native-trace';

interface NitroModulesProxyLike {
  createHybridObject<T>(name: string): T;
}

let native: IArgusPushNative | null | undefined;

function nativeTrace(): IArgusPushNative | null {
  if (native !== undefined) return native;
  try {
    native = (NitroModules as unknown as NitroModulesProxyLike).createHybridObject<IArgusPushNative>('ArgusPush');
  } catch {
    native = null;
  }
  return native;
}

installTraceSink((phase, outcome, reason) => {
  nativeTrace()?.recordTrace(phase, outcome, reason);
});

export {};
