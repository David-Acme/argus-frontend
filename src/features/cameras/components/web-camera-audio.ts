import { decodeFlacFrame } from '@/features/cameras/model/camera-audio';
import { parseAudioInit, parseFragment, type Fmp4AudioTrack } from '@/features/cameras/model/fmp4';
import {
  LIVE_AUDIO_LEAD_S,
  LIVE_AUDIO_MAX_LAG_S,
} from '@/features/cameras/model/camera-live-audio';

type BlockedListener = (blocked: boolean) => void;

export class WebCameraAudio {
  static readonly supported = typeof AudioContext !== 'undefined';

  private track: Fmp4AudioTrack | null = null;
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private level = 0;
  private nextTime = 0;
  private disposed = false;
  private stream: MediaStream | null = null;
  private streamSource: MediaStreamAudioSourceNode | null = null;

  constructor(private readonly onBlocked: BlockedListener) {}

  init(bytes: Uint8Array): void {
    this.track = parseAudioInit(bytes);
    this.nextTime = 0;
  }

  push(bytes: Uint8Array): void {
    const track = this.track;
    const context = this.context;
    if (!track || !context || !this.gain || this.level <= 0 || context.state !== 'running') return;
    for (const sample of parseFragment(bytes, track)) {
      const pcm = decodeFlacFrame(sample.data);
      if (pcm) this.schedule(context, pcm, track.sampleRate);
    }
  }

  attachStream(stream: MediaStream | null): void {
    this.stream = stream;
    this.connectStream();
  }

  setLevel(level: number): void {
    this.level = level;
    if (level > 0) this.ensureContext();
    if (this.gain && this.context)
      this.gain.gain.setTargetAtTime(level, this.context.currentTime, 0.05);
  }

  unlock(): void {
    const context = this.context;
    if (!context) return;
    void context
      .resume()
      .then(() => this.report(context))
      .catch(() => this.report(context));
  }

  dispose(): void {
    this.disposed = true;
    this.streamSource?.disconnect();
    this.streamSource = null;
    this.stream = null;
    const context = this.context;
    this.context = null;
    this.gain = null;
    void context?.close().catch(() => undefined);
  }

  private ensureContext(): void {
    if (this.context || this.disposed || !WebCameraAudio.supported) return;
    const context = new AudioContext({ latencyHint: 'interactive' });
    const gain = context.createGain();
    gain.gain.value = this.level;
    gain.connect(context.destination);
    this.context = context;
    this.gain = gain;
    context.onstatechange = () => this.report(context);
    this.connectStream();
    this.unlock();
  }

  private connectStream(): void {
    this.streamSource?.disconnect();
    this.streamSource = null;
    const context = this.context;
    const stream = this.stream;
    if (!context || !this.gain || !stream || stream.getAudioTracks().length === 0) return;
    this.streamSource = context.createMediaStreamSource(stream);
    this.streamSource.connect(this.gain);
  }

  private report(context: AudioContext): void {
    if (this.disposed || context !== this.context) return;
    this.onBlocked(context.state !== 'running' && context.state !== 'closed');
  }

  private schedule(context: AudioContext, pcm: Int16Array, sampleRate: number): void {
    if (!this.gain) return;
    const buffer = context.createBuffer(1, pcm.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < pcm.length; index += 1) channel[index] = (pcm[index] ?? 0) / 32768;
    const now = context.currentTime;
    if (this.nextTime < now || this.nextTime - now > LIVE_AUDIO_MAX_LAG_S)
      this.nextTime = now + LIVE_AUDIO_LEAD_S;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start(this.nextTime);
    this.nextTime += buffer.duration;
  }
}
