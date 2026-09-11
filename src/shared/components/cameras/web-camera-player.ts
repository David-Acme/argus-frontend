import { parseFragment, parseInit } from '@/shared/libs/fmp4';

const MAX_QUEUED_FRAMES = 8;

/** WebCodecs fMP4 player: decodes H.264 fragments and paints them on a canvas. */
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
  private timescale = 0;
  private pending = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
  }

  reset(): void {
    this.decoder?.close();
    this.decoder = null;
    this.timescale = 0;
    this.sampleSizes.length = 0;
    this.pending = 0;
  }

  push(type: number, data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    if (type === 1) {
      this.startStream(bytes);
      return;
    }
    if (!this.decoder || this.decoder.state !== 'configured') return;
    for (const sample of parseFragment(bytes, this.timescale)) {
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
    return this.pending;
  }

  dispose(): void {
    this.reset();
  }

  private startStream(init: Uint8Array): void {
    const config = parseInit(init);
    if (!config) return;
    this.reset();
    this.timescale = config.timescale;
    this.decoder = new VideoDecoder({
      output: (frame) => this.draw(frame),
      error: () => this.reset(),
    });
    this.decoder.configure({
      codec: config.codec,
      description: config.description,
    });
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
