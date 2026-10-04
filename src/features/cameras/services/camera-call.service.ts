import type { IArgusSocket, ICameraMediaSession, IVoiceMic } from '@/core/interfaces';
import type { CameraCallState, CameraTalkMode } from '@/core/types';
import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { sessionService } from '@/core/services/session.service';
import { CAMERA_STREAM_WS_PATH } from '@/features/cameras/constants';
import { applyGain, decodeFlacFrame, levelOf, talkFrame } from '@/features/cameras/model/camera-audio';
import { parseAudioInit, parseFragment, type Fmp4AudioTrack } from '@/features/cameras/model/fmp4';
import { cameraMediaService } from '@/features/cameras/services/camera-media.service';
import { createVoiceMic } from '@/features/voice';

export type CameraCallSnapshot = {
  state: CameraCallState;
  mode: CameraTalkMode;
  muted: boolean;
  talking: boolean;
  listening: boolean;
  volume: number;
  micLevel: number;
  cameraLevel: number;
  latencyMs: number | null;
  error: string | null;
  closedReason: string | null;
};

export type CameraCallOptions = {
  cameraId: string;
  mode: CameraTalkMode;
  listen: boolean;
};

type Listener = (snapshot: CameraCallSnapshot) => void;

type TalkFrame = {
  type?: string;
  status?: number;
  error?: string;
  payload?: { queuedMs?: number; packetMs?: number; reason?: string };
};

const CAPTURE_RATE = 16000;
const PACKET_MS = 120;
const MAX_PLAYOUT_LAG_SAMPLES = 8000 * 0.6;
const LEVEL_DECAY = 0.85;

const IDLE: CameraCallSnapshot = {
  state: 'idle',
  mode: 'call',
  muted: false,
  talking: false,
  listening: false,
  volume: 1,
  micLevel: 0,
  cameraLevel: 0,
  latencyMs: null,
  error: null,
  closedReason: null,
};

export class CameraCall {
  private snapshot: CameraCallSnapshot = IDLE;
  private readonly listeners = new Set<Listener>();
  private socket: IArgusSocket | null = null;
  private media: ICameraMediaSession | null = null;
  private mic: IVoiceMic | null = null;
  private micRunning = false;
  private playerRate = 0;
  private written = 0;
  private audioTrack: Fmp4AudioTrack | null = null;
  private ended = false;
  private pushHeld = false;

  constructor(private readonly options: CameraCallOptions) {
    this.snapshot = { ...IDLE, mode: options.mode, listening: options.listen };
  }

  get current(): CameraCallSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    this.mic = createVoiceMic();
    this.mic.onError = (code, message) => this.fail(code === 'MIC_PERMISSION_DENIED' ? 'mic-denied' : 'mic-unavailable', message);
    this.mic.onData = (pcm) => this.onMicData(pcm);
    this.update({ state: 'connecting', error: null, closedReason: null });
    if (this.options.listen) this.startListening();
    if (this.options.mode === 'call') await this.openLine();
    else this.update({ state: 'live' });
  }

  setMuted(muted: boolean): void {
    this.update({ muted });
  }

  setVolume(volume: number): void {
    this.update({ volume: Math.max(0, Math.min(2, volume)) });
  }

  setListening(listening: boolean): void {
    if (listening === this.snapshot.listening) return;
    if (listening) this.startListening();
    else this.stopListening();
    this.update({ listening });
  }

  async pressToTalk(): Promise<void> {
    this.pushHeld = true;
    this.update({ talking: true });
    if (!this.socket) await this.openLine();
    else this.startMic();
  }

  releaseToTalk(): void {
    this.pushHeld = false;
    this.stopMic();
    this.update({ talking: false, micLevel: 0 });
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.update({ state: 'ending' });
    this.stopMic();
    this.socket?.sendText(JSON.stringify({ type: 'camera:talk:stop', payload: {} }));
    this.closeSocket();
    this.stopListening();
    this.update({ state: 'idle', talking: false, micLevel: 0, cameraLevel: 0 });
    this.listeners.clear();
  }

  private update(patch: Partial<CameraCallSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private fail(error: string, detail?: string): void {
    this.stopMic();
    this.closeSocket();
    this.update({ state: this.options.listen && this.media ? 'live' : 'idle', error, talking: false, closedReason: detail ?? null });
  }

  private async openLine(): Promise<void> {
    if (this.ended || this.socket) return;
    const token = sessionService.getAccessToken();
    const instance = await netService.instance();
    if (!token || !instance) {
      this.fail('no-session');
      return;
    }
    let socket: IArgusSocket;
    try {
      socket = await netService.openSocket({
        url: serviceUrl(instance, CAMERA_STREAM_WS_PATH, 'wss'),
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      this.fail('network');
      return;
    }
    if (this.ended) {
      socket.close(1000, 'closed');
      return;
    }
    this.socket = socket;
    socket.onOpen = () =>
      socket.sendText(
        JSON.stringify({
          type: 'camera:talk:start',
          payload: { cameraId: Number(this.options.cameraId), sampleRate: CAPTURE_RATE },
        }),
      );
    socket.onMessage = (message) => {
      if (message) this.onTalkMessage(message);
    };
    socket.onError = () => {
      if (this.socket === socket) this.fail('network');
    };
    socket.onClose = (code, reason) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.stopMic();
      if (!this.ended) this.update({ state: this.options.mode === 'push' ? 'live' : 'idle', talking: false, closedReason: reason || String(code) });
    };
  }

  private closeSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onOpen = null;
    socket.onMessage = null;
    socket.onError = null;
    socket.onClose = null;
    socket.close(1000, 'closed');
  }

  private onTalkMessage(message: string): void {
    let frame: TalkFrame;
    try {
      frame = JSON.parse(message) as TalkFrame;
    } catch {
      return;
    }
    if (frame.type === 'camera:talk:ready') {
      this.update({ state: 'live', error: null });
      if (this.options.mode === 'call' || this.pushHeld) this.startMic();
      return;
    }
    if (frame.type === 'camera:talk:state') {
      const queued = frame.payload?.queuedMs ?? 0;
      this.update({ latencyMs: Math.round(queued + PACKET_MS + 80) });
      return;
    }
    if (frame.type === 'camera:talk:start_error') {
      const status = frame.status ?? 0;
      const reason = status === 409 ? 'busy' : status === 403 ? 'forbidden' : status === 422 ? 'no-speaker' : 'refused';
      this.fail(reason, frame.error);
      return;
    }
    if (frame.type === 'camera:talk:closed') {
      const reason = frame.payload?.reason ?? 'stopped';
      this.stopMic();
      this.closeSocket();
      if (this.options.mode === 'call' && reason !== 'stopped') this.update({ state: 'idle', closedReason: reason, talking: false });
      else this.update({ talking: false });
    }
  }

  private startMic(): void {
    if (this.micRunning || !this.mic) return;
    this.micRunning = true;
    this.mic.start(CAPTURE_RATE);
    if (this.options.mode === 'push') this.update({ talking: true });
  }

  private stopMic(): void {
    if (!this.micRunning || !this.mic) return;
    this.micRunning = false;
    this.mic.stop();
  }

  private onMicData(pcm: ArrayBuffer | null): void {
    if (!pcm || !this.socket) return;
    const muted = this.snapshot.muted;
    this.socket.sendBinary(talkFrame(pcm, muted));
    if (muted) {
      if (this.snapshot.micLevel !== 0) this.update({ micLevel: 0 });
      return;
    }
    const level = levelOf(new Int16Array(pcm));
    this.update({ micLevel: Math.max(level, this.snapshot.micLevel * LEVEL_DECAY) });
  }

  private startListening(): void {
    if (this.media || this.ended) return;
    void cameraMediaService
      .open({
        cameraId: Number(this.options.cameraId),
        quality: 'sub',
        sink: {
          resetStream: () => {
            this.audioTrack = null;
          },
          pushFragment: (type, _keyframe, data) => this.onMedia(type, data),
          bufferedBytes: () => 0,
        },
      })
      .then((session) => {
        if (this.ended || !this.snapshot.listening) session.close();
        else this.media = session;
      });
  }

  private stopListening(): void {
    this.media?.close();
    this.media = null;
    this.audioTrack = null;
    if (this.playerRate > 0) this.mic?.playerStop();
    this.playerRate = 0;
    this.written = 0;
  }

  private onMedia(type: number, data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    if (type === 1) {
      this.audioTrack = parseAudioInit(bytes);
      return;
    }
    const track = this.audioTrack;
    if (!track || !this.mic || !this.snapshot.listening) return;
    if (this.playerRate !== track.sampleRate) {
      if (this.playerRate > 0) this.mic.playerStop();
      this.mic.playerStart(track.sampleRate);
      this.playerRate = track.sampleRate;
      this.written = 0;
    }
    for (const sample of parseFragment(bytes, track)) {
      const pcm = decodeFlacFrame(sample.data);
      if (!pcm) continue;
      if (this.written - this.mic.playedSamples() > MAX_PLAYOUT_LAG_SAMPLES) {
        this.mic.playerFlush();
        this.written = this.mic.playedSamples();
      }
      const ducked = this.options.mode === 'push' && this.snapshot.talking ? 0.25 : 1;
      const out = applyGain(pcm, this.snapshot.volume * ducked);
      this.mic.playerWrite(out.buffer as ArrayBuffer);
      this.written += out.length;
      const level = levelOf(pcm);
      this.update({ cameraLevel: Math.max(level, this.snapshot.cameraLevel * LEVEL_DECAY) });
    }
  }
}
