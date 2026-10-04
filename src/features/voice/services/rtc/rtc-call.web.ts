import type { IRealtimeCall } from '@/core/interfaces';
import { IS_TAURI } from '@/shared/constants';
import { LivekitRealtimeCall } from './rtc-livekit';
import { TauriRealtimeCall } from './rtc-tauri';

export function rtcCallSupported(): boolean {
  return IS_TAURI || typeof RTCPeerConnection !== 'undefined';
}

export function createRealtimeCall(): IRealtimeCall {
  return IS_TAURI ? new TauriRealtimeCall() : new LivekitRealtimeCall({ attachAudio: true });
}
