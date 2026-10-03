import type { IVoiceMic } from '@/core/interfaces';
import { VOICE_WORKLET_URL } from '@/features/voice/constants/voice';

const CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

type PlayerMessage = {
  played: number;
  idle?: boolean;
};

function errorCode(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'MIC_PERMISSION_DENIED' : 'MIC_UNAVAILABLE';
}

class WebVoiceMic implements IVoiceMic {
  onData: ((pcm: ArrayBuffer | null) => void) | null = null;
  onError: ((code: string, message: string) => void) | null = null;
  onPlayerIdle: (() => void) | null = null;

  private context: Promise<AudioContext> | null = null;
  private stream: MediaStream | null = null;
  private capture: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private player: AudioWorkletNode | null = null;
  private pendingWrites: ArrayBuffer[] = [];
  private captureGeneration = 0;
  private playerGeneration = 0;
  private played = 0;

  start(sampleRate: number): void {
    void this.startCapture(sampleRate);
  }

  stop(): void {
    this.captureGeneration += 1;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.source?.disconnect();
    this.capture?.disconnect();
    if (this.capture) this.capture.port.onmessage = null;
    this.stream = null;
    this.source = null;
    this.capture = null;
    this.onData?.(null);
    this.releaseContext();
  }

  playerStart(sampleRate: number): void {
    void this.startPlayer(sampleRate);
  }

  playerWrite(pcm: ArrayBuffer): void {
    const copy = pcm.slice(0);
    if (!this.player) {
      this.pendingWrites.push(copy);
      return;
    }
    this.player.port.postMessage(copy, [copy]);
  }

  playerFlush(): void {
    this.pendingWrites = [];
    this.player?.port.postMessage('flush');
  }

  playerStop(): void {
    this.playerGeneration += 1;
    this.pendingWrites = [];
    this.player?.disconnect();
    if (this.player) this.player.port.onmessage = null;
    this.player = null;
    this.releaseContext();
  }

  playedSamples(): number {
    return this.played;
  }

  private async startCapture(sampleRate: number): Promise<void> {
    const generation = (this.captureGeneration += 1);
    try {
      const context = await this.ensureContext(sampleRate);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: CAPTURE_CONSTRAINTS });
      if (generation !== this.captureGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const capture = new AudioWorkletNode(context, 'argus-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { targetRate: sampleRate },
      });
      const silent = context.createGain();
      silent.gain.value = 0;
      capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => this.onData?.(event.data);
      const source = context.createMediaStreamSource(stream);
      source.connect(capture);
      capture.connect(silent);
      silent.connect(context.destination);
      this.stream = stream;
      this.source = source;
      this.capture = capture;
    } catch (error) {
      if (generation === this.captureGeneration) this.onError?.(errorCode(error), String(error));
    }
  }

  private async startPlayer(sampleRate: number): Promise<void> {
    const generation = (this.playerGeneration += 1);
    this.played = 0;
    try {
      const context = await this.ensureContext(sampleRate);
      if (generation !== this.playerGeneration) return;
      const player = new AudioWorkletNode(context, 'argus-player', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { sourceRate: sampleRate },
      });
      player.port.onmessage = (event: MessageEvent<PlayerMessage>) => {
        this.played = event.data.played;
        if (event.data.idle) this.onPlayerIdle?.();
      };
      player.connect(context.destination);
      this.player = player;
      const pending = this.pendingWrites;
      this.pendingWrites = [];
      for (const pcm of pending) player.port.postMessage(pcm, [pcm]);
    } catch (error) {
      if (generation === this.playerGeneration) this.onError?.('PLAYER_UNAVAILABLE', String(error));
    }
  }

  private ensureContext(sampleRate: number): Promise<AudioContext> {
    this.context ??= (async () => {
      let context: AudioContext;
      try {
        context = new AudioContext({ sampleRate, latencyHint: 'interactive' });
      } catch {
        context = new AudioContext({ latencyHint: 'interactive' });
      }
      await context.audioWorklet.addModule(VOICE_WORKLET_URL);
      await context.resume();
      return context;
    })();
    return this.context;
  }

  private releaseContext(): void {
    if (this.capture || this.player || !this.context) return;
    const context = this.context;
    this.context = null;
    void context.then((audio) => audio.close()).catch(() => undefined);
  }
}

export function voiceCallSupported(): boolean {
  return (
    typeof AudioWorkletNode !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

export function createVoiceMic(): IVoiceMic {
  if (!voiceCallSupported()) throw new Error('NOT_SUPPORTED|Voice is not supported on this platform');
  return new WebVoiceMic();
}
