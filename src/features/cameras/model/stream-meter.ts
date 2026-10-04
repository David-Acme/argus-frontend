import { parseAudioInit, parseFragment, parseInit, type Fmp4Init } from './fmp4';

export type StreamStats = {
  width: number;
  height: number;
  fps: number;
  audio: boolean;
};

const FPS_WINDOW = 60;

export class StreamMeter {
  private track: Fmp4Init | null = null;
  private audio = false;
  private durations: number[] = [];
  private last: StreamStats | null = null;

  init(bytes: Uint8Array): StreamStats | null {
    this.track = parseInit(bytes);
    this.audio = parseAudioInit(bytes) != null;
    this.durations = [];
    return this.publish();
  }

  fragment(bytes: Uint8Array): StreamStats | null {
    if (!this.track) return null;
    for (const sample of parseFragment(bytes, this.track)) {
      if (sample.durationUs <= 0) continue;
      this.durations.push(sample.durationUs);
      if (this.durations.length > FPS_WINDOW) this.durations.shift();
    }
    return this.publish();
  }

  private publish(): StreamStats | null {
    if (!this.track) return null;
    const next: StreamStats = {
      width: this.track.width,
      height: this.track.height,
      fps: fpsOf(this.durations),
      audio: this.audio,
    };
    const last = this.last;
    if (
      last &&
      last.width === next.width &&
      last.height === next.height &&
      last.fps === next.fps &&
      last.audio === next.audio
    )
      return null;
    this.last = next;
    return next;
  }
}

export function fpsOf(durationsUs: readonly number[]): number {
  const total = durationsUs.reduce((sum, duration) => sum + duration, 0);
  return total > 0 ? Math.round((durationsUs.length * 1_000_000) / total) : 0;
}
