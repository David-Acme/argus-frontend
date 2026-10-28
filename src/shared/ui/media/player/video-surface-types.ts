import type { PlayerStatus } from './player-model';

export type PlayerSource = { key: string; data: ArrayBuffer };

export type SurfaceHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (positionMs: number) => void;
  setRate: (rate: number) => void;
  reclaim: () => void;
  positionMs: () => number;
  durationMs: () => number;
  bufferedMs: () => number;
};

export type SurfaceEvents = {
  onReady: (handle: SurfaceHandle) => void;
  onStatus: (status: PlayerStatus) => void;
  onFirstFrame: () => void;
  onAudioFailed: () => void;
};

export type VideoSurfaceProps = {
  source: PlayerSource;
  adopt?: boolean;
  autoPlay: boolean;
  muted: boolean;
  events: SurfaceEvents;
};

const STATUSES: readonly PlayerStatus[] = ['loading', 'ready', 'playing', 'ended', 'error'];

export function statusOf(state: string): PlayerStatus {
  return STATUSES.find((status) => status === state) ?? 'loading';
}
