import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { IRealtimeCall } from '@/core/interfaces';
import type { RtcJoin } from '@/core/types';
import { netService } from '@/core/services/net';
import { pinnedRtcUrl } from '@/features/voice/model/rtc-protocol';
import { pinSocketOrigin, routedWebSocket } from './pinned-websocket';
import { LivekitRealtimeCall } from './rtc-livekit';

let globalsReady = false;
let unpinOrigin: (() => void) | null = null;

function nativeWebRtcLinked(): boolean {
  return TurboModuleRegistry.get('WebRTCModule') != null || NativeModules.WebRTCModule != null;
}

async function ensureGlobals(): Promise<void> {
  if (globalsReady) return;
  const livekit = await import('@livekit/react-native');
  livekit.registerGlobals();
  globalThis.WebSocket = routedWebSocket(globalThis.WebSocket, (url) =>
    netService.openSocket({ url })
  ) as unknown as typeof WebSocket;
  globalsReady = true;
}

async function prepare(join: RtcJoin): Promise<RtcJoin> {
  await ensureGlobals();
  const instance = await netService.instance();
  const url = instance ? pinnedRtcUrl(join.url, instance.host) : null;
  if (!url) throw new Error('PAIRING_REQUIRED|Server is not paired yet');
  unpinOrigin?.();
  unpinOrigin = pinSocketOrigin(url);
  const { AudioSession, AndroidAudioTypePresets } = await import('@livekit/react-native');
  await AudioSession.configureAudio({
    android: { audioTypeOptions: AndroidAudioTypePresets.communication },
  });
  await AudioSession.startAudioSession();
  return { ...join, url };
}

async function release(): Promise<void> {
  unpinOrigin?.();
  unpinOrigin = null;
  const { AudioSession } = await import('@livekit/react-native');
  await AudioSession.stopAudioSession();
}

export function rtcCallSupported(): boolean {
  return nativeWebRtcLinked();
}

export function createRealtimeCall(): IRealtimeCall {
  return new LivekitRealtimeCall({ attachAudio: false, prepare, release });
}
