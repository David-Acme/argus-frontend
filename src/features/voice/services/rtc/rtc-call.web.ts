import type { IRealtimeCall } from '@/core/interfaces';
import { IS_TAURI } from '@/shared/constants';
import { LivekitRealtimeCall } from './rtc-livekit';
import { webMicrophone } from './rtc-microphone';
import { TauriRealtimeCall } from './rtc-tauri';

export function rtcCallSupported(): boolean {
  return IS_TAURI || typeof RTCPeerConnection !== 'undefined';
}

export function createRealtimeCall(): IRealtimeCall {
  return IS_TAURI
    ? new TauriRealtimeCall(webMicrophone)
    : new LivekitRealtimeCall({ attachAudio: true, microphone: webMicrophone });
}
