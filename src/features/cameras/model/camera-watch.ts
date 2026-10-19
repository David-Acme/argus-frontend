import type { TranslationKey } from '@/core/types';
import type { WatchmanReadiness } from '@/features/privacy';

export type CameraListening =
  | 'listening'
  | 'off'
  | 'no-audio'
  | 'masked'
  | 'disabled'
  | 'no-speaker'
  | 'household-off'
  | 'household-audio';

export type CameraListeningInput = {
  watchman: boolean;
  noAudio: boolean;
  masked: boolean;
  enabled: boolean;
  talk: boolean | null;
  household: WatchmanReadiness | null;
};

export function cameraListening(input: CameraListeningInput): CameraListening {
  if (input.noAudio) return 'no-audio';
  if (!input.watchman) return 'off';
  if (!input.enabled) return 'disabled';
  if (input.masked) return 'masked';
  if (input.talk === false) return 'no-speaker';
  if (input.household === 'off') return 'household-off';
  if (input.household === 'audio-off' || input.household === 'audio-held') return 'household-audio';
  return 'listening';
}

export const CAMERA_LISTENING_LABEL = {
  listening: 'screens.cameras.watch.state.listening',
  off: 'screens.cameras.watch.state.off',
  'no-audio': 'screens.cameras.watch.state.no-audio',
  masked: 'screens.cameras.watch.state.masked',
  disabled: 'screens.cameras.watch.state.disabled',
  'no-speaker': 'screens.cameras.watch.state.no-speaker',
  'household-off': 'screens.cameras.watch.state.household-off',
  'household-audio': 'screens.cameras.watch.state.household-audio',
} as const satisfies Record<CameraListening, TranslationKey>;

export type CameraWatchPatch = { watchman: boolean } | { noAudio: boolean };

export function watchPatchOf(field: 'watchman' | 'noAudio', value: boolean): CameraWatchPatch {
  return field === 'watchman' ? { watchman: value } : { noAudio: value };
}
