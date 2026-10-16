import { NitroModules } from 'react-native-nitro-modules';
import type { IArgusPushNative } from '@/core/interfaces';
import type { SessionTraceOutcome, SessionTracePhase } from './session-trace.types';

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

export function traceSession(phase: SessionTracePhase, outcome: SessionTraceOutcome, reason: string): void {
  try {
    nativeTrace()?.recordSession(phase, outcome, reason);
  } catch {
  }
}
