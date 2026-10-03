import { parseFragment, parseInit } from '@/features/cameras/model/fmp4';

const MAX_QUEUED_FRAMES = 8;
const MAX_LATENCY_BYTES = 768 * 1024;

export class WebCameraPlayer {
  static get supported(): boolean {
    return (
      typeof VideoDecoder !== 'undefined' &&
      typeof EncodedVideoChunk !== 'undefined'
    );
  }

  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly sampleSizes: number[] = [];
  private decoder: VideoDecoder | null = null;
  private config: VideoDecoderConfig | null = null;
  private timescale = 0;
  private pending = 0;
  private dropUntilKeyframe = false;
  private paused = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
  }

  reset(): void {
    this.decoder?.close();
    this.decoder = null;
    this.config = null;
    this.timescale = 0;
    this.sampleSizes.length = 0;
    this.pending = 0;
    this.dropUntilKeyframe = false;
  }

  setVisible(visible: boolean): void {
    if (visible === !this.paused) return;
    this.paused = !visible;
    this.sampleSizes.length = 0;
    this.pending = 0;
    this.dropUntilKeyframe = true;
  }

  push(type: number, data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    if (type === 1) {
      this.startStream(bytes);
      return;
    }
    if (this.paused || !this.decoder || this.decoder.state !== 'configured')
      return;

    for (const sample of parseFragment(bytes, this.timescale)) {
      if (this.dropUntilKeyframe) {
        if (!sample.isKey) continue;
        this.rewind();
        this.dropUntilKeyframe = false;
      }
      if (this.pending > MAX_LATENCY_BYTES && !sample.isKey) {
        this.dropUntilKeyframe = true;
        continue;
      }
      if (this.decoder.decodeQueueSize > MAX_QUEUED_FRAMES && !sample.isKey)
        continue;
      this.sampleSizes.push(sample.data.byteLength);
      this.pending += sample.data.byteLength;
      this.decoder.decode(
        new EncodedVideoChunk({
          type: sample.isKey ? 'key' : 'delta',
          timestamp: sample.timestampUs,
          duration: sample.durationUs,
          data: sample.data,
        }),
      );
    }
  }

  buffered(): number {
    return this.paused ? Number.MAX_SAFE_INTEGER : this.pending;
  }

  dispose(): void {
    this.reset();
  }

  private startStream(init: Uint8Array): void {
    const parsed = parseInit(init);
    if (!parsed) return;
    this.reset();
    this.timescale = parsed.timescale;
    this.config = {
      codec: parsed.codec,
      description: parsed.description,
    };
    this.decoder = new VideoDecoder({
      output: (frame) => this.draw(frame),
      error: () => this.rewind(),
    });
    this.decoder.configure(this.config);
  }

  private rewind(): void {
    if (!this.decoder || !this.config || this.decoder.state === 'closed') return;
    this.sampleSizes.length = 0;
    this.pending = 0;
    try {
      this.decoder.reset();
      this.decoder.configure(this.config);
    } catch {
      this.decoder = null;
    }
  }

  private draw(frame: VideoFrame): void {
    const size = this.sampleSizes.shift();
    if (size != null) this.pending = Math.max(0, this.pending - size);
    if (
      this.canvas.width !== frame.displayWidth ||
      this.canvas.height !== frame.displayHeight
    ) {
      this.canvas.width = frame.displayWidth;
      this.canvas.height = frame.displayHeight;
    }
    this.context?.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
    frame.close();
  }
}
