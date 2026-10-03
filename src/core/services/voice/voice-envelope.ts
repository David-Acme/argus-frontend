import { pcmRms } from '@/shared/libs/pcm';

type EnvelopeSegment = {
  start: number;
  end: number;
  level: number;
};

const FULL_SCALE_RMS = 0.3;
const COMPACT_AFTER = 256;

export function envelopeLevel(rms: number): number {
  return Math.min(1, rms / FULL_SCALE_RMS);
}

export class PlayoutEnvelope {
  private segments: EnvelopeSegment[] = [];
  private head = 0;
  private written = 0;

  constructor(private readonly windowSamples: number) {}

  get writtenSamples(): number {
    return this.written;
  }

  append(samples: Int16Array): void {
    const window = Math.max(1, this.windowSamples);
    for (let offset = 0; offset < samples.length; offset += window) {
      const end = Math.min(samples.length, offset + window);
      this.segments.push({
        start: this.written + offset,
        end: this.written + end,
        level: envelopeLevel(pcmRms(samples, offset, end)),
      });
    }
    this.written += samples.length;
  }

  levelAt(position: number): number {
    while (this.head < this.segments.length && this.segments[this.head].end <= position) {
      this.head += 1;
    }
    if (this.head >= COMPACT_AFTER) {
      this.segments = this.segments.slice(this.head);
      this.head = 0;
    }
    const segment = this.segments[this.head];
    return segment && segment.start <= position ? segment.level : 0;
  }

  reset(): void {
    this.segments = [];
    this.head = 0;
    this.written = 0;
  }
}
