import type { CameraTransport } from '@/core/types';

export const LIVE_AUDIO_STORAGE_KEY = 'cameras.audio.muted';
export const LIVE_AUDIO_LEAD_S = 0.08;
export const LIVE_AUDIO_MAX_LAG_S = 0.6;

export type LiveAudioContext = {
  muted: boolean;
  argusCall: boolean;
  cameraCall: boolean;
};

export type LiveAudioReason = 'on' | 'muted' | 'argus-call' | 'camera-call';

export function liveAudioReason({ muted, argusCall, cameraCall }: LiveAudioContext): LiveAudioReason {
  if (muted) return 'muted';
  if (argusCall) return 'argus-call';
  if (cameraCall) return 'camera-call';
  return 'on';
}

export function liveAudioLevel(context: LiveAudioContext): number {
  return liveAudioReason(context) === 'on' ? 1 : 0;
}

export function storedMuted(value: boolean | null): boolean {
  return value === true;
}

export type LivePlayerAudio = {
  level: number;
  transport: CameraTransport | null;
};

export function nativePlayerMuted({ level, transport }: LivePlayerAudio): boolean {
  return level <= 0 || transport === 'webrtc';
}

export type LiveAudioPlayback = {
  transport: CameraTransport | null;
  fragmentAudio: boolean;
};

export function liveAudioPlayable({ transport, fragmentAudio }: LiveAudioPlayback): boolean {
  if (transport === 'webrtc') return true;
  return transport === 'ws' && fragmentAudio;
}
