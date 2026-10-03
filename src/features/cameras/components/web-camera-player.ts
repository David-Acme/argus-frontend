import { parseFragment, parseInit, type Fmp4Init, type Fmp4Sample } from '@/features/cameras/model/fmp4';

const INIT_FRAME_TYPE = 1;
const MAX_QUEUED_FRAMES = 8;
const MAX_LATENCY_BYTES = 768 * 1024;

export type WebCameraPlayerEvents = {
  onFirstFrame?: () => void;
  onUnsupported?: (codec: string) => void;
};

export class WebCameraPlayer {
  static get supported(): boolean {
    return typeof VideoDecoder !== 'undefined' && typeof EncodedVideoChunk !== 'undefined';
  }

  private readonly context: CanvasRenderingContext2D | null;
  private readonly sampleSizes: number[] = [];
  private decoder: VideoDecoder | null = null;
  private track: Fmp4Init | null = null;
  private config: VideoDecoderConfig | null = null;
  private pending = 0;
  private awaitingKey = true;
  private painted = false;
  private paused = false;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly events: WebCameraPlayerEvents = {},
  ) {
    this.context = canvas.getContext('2d');
  }

  reset(): void {
    this.closeDecoder();
    this.track = null;
    this.config = null;
    this.painted = false;
  }

  setVisible(visible: boolean): void {
    if (visible === !this.paused) return;
    this.paused = !visible;
    this.closeDecoder();
  }

  push(type: number, data: ArrayBuffer): void {
    if (this.disposed) return;
    const bytes = new Uint8Array(data);
    if (type === INIT_FRAME_TYPE) {
      this.startStream(bytes);
      return;
    }
    if (this.paused || !this.track) return;
    for (const sample of parseFragment(bytes, this.track)) this.decode(sample);
  }

  buffered(): number {
    return this.paused ? Number.MAX_SAFE_INTEGER : this.pending;
  }

  dispose(): void {
    this.disposed = true;
    this.reset();
  }

  private startStream(init: Uint8Array): void {
    const track = parseInit(init);
    if (!track) return;
    this.reset();
    this.track = track;
    const config: VideoDecoderConfig = {
      codec: track.codec,
      description: track.description,
      optimizeForLatency: true,
    };
    this.config = config;
    void VideoDecoder.isConfigSupported(config)
      .then((support) => {
        if (!support.supported && this.config === config) this.events.onUnsupported?.(config.codec);
      })
      .catch(() => undefined);
  }

  private decoderFor(): VideoDecoder | null {
    if (this.decoder?.state === 'configured') return this.decoder;
    const config = this.config;
    if (!config) return null;
    this.closeDecoder();
    const decoder = new VideoDecoder({
      output: (frame) => this.draw(frame),
      error: () => {
        if (this.decoder === decoder) this.closeDecoder();
      },
    });
    try {
      decoder.configure(config);
    } catch {
      this.events.onUnsupported?.(config.codec);
      return null;
    }
    this.decoder = decoder;
    this.awaitingKey = true;
    return decoder;
  }

  private decode(sample: Fmp4Sample): void {
    if (this.awaitingKey && !sample.isKey) return;
    const decoder = this.decoderFor();
    if (!decoder) return;
    const behind = this.pending > MAX_LATENCY_BYTES || decoder.decodeQueueSize > MAX_QUEUED_FRAMES;
    if (behind && !sample.isKey) {
      this.awaitingKey = true;
      return;
    }
    this.awaitingKey = false;
    try {
      decoder.decode(
        new EncodedVideoChunk({
          type: sample.isKey ? 'key' : 'delta',
          timestamp: sample.timestampUs,
          duration: sample.durationUs,
          data: sample.data,
        }),
      );
    } catch {
      this.closeDecoder();
      return;
    }
    this.sampleSizes.push(sample.data.byteLength);
    this.pending += sample.data.byteLength;
  }

  private closeDecoder(): void {
    const decoder = this.decoder;
    this.decoder = null;
    this.sampleSizes.length = 0;
    this.pending = 0;
    this.awaitingKey = true;
    if (decoder && decoder.state !== 'closed') decoder.close();
  }

  private draw(frame: VideoFrame): void {
    const size = this.sampleSizes.shift();
    if (size != null) this.pending = Math.max(0, this.pending - size);
    if (this.disposed) {
      frame.close();
      return;
    }
    if (this.canvas.width !== frame.displayWidth || this.canvas.height !== frame.displayHeight) {
      this.canvas.width = frame.displayWidth;
      this.canvas.height = frame.displayHeight;
    }
    this.context?.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
    frame.close();
    if (!this.painted) {
      this.painted = true;
      this.events.onFirstFrame?.();
    }
  }
}
