import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { IRealtimeCall } from '@/core/interfaces';
import type { RtcJoin } from '@/core/types';
import { netService } from '@/core/services/net';
import { pushService } from '@/core/services/push';
import { traceEvent } from '@/core/services/native-trace';
import { pinnedRtcUrl } from '@/features/voice/model/rtc-protocol';
import { pinSocketOrigin, routedWebSocket } from './pinned-websocket';
import { LivekitRealtimeCall } from './rtc-livekit';

const importLivekit = () => import('@livekit/react-native');
let livekitModule: ReturnType<typeof importLivekit> | undefined;
const livekit = () => (livekitModule ??= importLivekit());

let globalsReady = false;
let unpinOrigin: (() => void) | null = null;
let audioSessionOwned = false;

function nativeWebRtcLinked(): boolean {
  return TurboModuleRegistry.get('WebRTCModule') != null || NativeModules.WebRTCModule != null;
}

async function ensureGlobals(): Promise<void> {
  if (globalsReady) return;
  (await livekit()).registerGlobals();
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
  if (!pushService.telecomCallActive()) await pushService.startAssistantCall();
  audioSessionOwned = !pushService.telecomCallActive();
  traceEvent('voice', 'start', audioSessionOwned ? 'audio-session-app' : 'audio-session-telecom');
  if (audioSessionOwned) {
    const { AudioSession, AndroidAudioTypePresets } = await livekit();
    await AudioSession.configureAudio({
      android: { audioTypeOptions: AndroidAudioTypePresets.communication },
    });
    await AudioSession.startAudioSession();
  }
  return { ...join, url };
}

async function release(): Promise<void> {
  unpinOrigin?.();
  unpinOrigin = null;
  if (!audioSessionOwned) return;
  audioSessionOwned = false;
  const { AudioSession } = await livekit();
  await AudioSession.stopAudioSession();
}

export function rtcCallSupported(): boolean {
  return nativeWebRtcLinked();
}

export function createRealtimeCall(): IRealtimeCall {
  return new LivekitRealtimeCall({ attachAudio: false, prepare, release });
}
