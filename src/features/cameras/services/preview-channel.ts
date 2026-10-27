import type { ICameraMediaSink } from '@/core/interfaces';
import { CAMERA_STREAM_ACK_THRESHOLD_BYTES } from '@/features/cameras/constants';
import type { MediaHeader, PreviewState } from '@/features/cameras/model/camera-preview';
import { FragmentAssembler } from '@/features/cameras/model/fragment-assembler';

export type PreviewEntry = {
  cameraId: number;
  order: number;
  fastStart: boolean;
  sink: ICameraMediaSink;
  onState: (state: PreviewState) => void;
};

const INIT_FRAME_TYPE = 1;
const MEDIA_FRAME_TYPE = 2;

export class PreviewChannel {
  subId: number | null = null;
  failures = 0;
  private pendingAck = 0;
  private startedAt = 0;
  private lastMediaAt = 0;
  private fragmentKey = false;
  private state: PreviewState | null = null;
  private readonly assembler = new FragmentAssembler();

  constructor(
    readonly key: string,
    readonly entry: PreviewEntry
  ) {}

  get order(): number {
    return this.entry.order;
  }

  publish(state: PreviewState): void {
    if (this.state === state) return;
    this.state = state;
    this.entry.onState(state);
  }

  begin(subId: number, now: number): void {
    if (this.subId === subId) return;
    this.subId = subId;
    this.startedAt = now;
  }

  reset(): void {
    this.subId = null;
    this.pendingAck = 0;
    this.startedAt = 0;
    this.lastMediaAt = 0;
    this.fragmentKey = false;
    this.assembler.reset();
    this.entry.sink.resetStream();
  }

  receive(header: MediaHeader, payload: Uint8Array, now: number): boolean {
    if (header.type === INIT_FRAME_TYPE) {
      this.assembler.reset();
      this.entry.sink.pushFragment(INIT_FRAME_TYPE, true, payload.slice().buffer);
      return false;
    }
    if (header.type !== MEDIA_FRAME_TYPE) return false;
    if (this.assembler.pendingBytes() === 0) this.fragmentKey = header.keyframe;
    for (const fragment of this.assembler.push(payload)) {
      this.entry.sink.pushFragment(MEDIA_FRAME_TYPE, this.fragmentKey, fragment.buffer);
      this.fragmentKey = false;
    }
    this.pendingAck += payload.byteLength;
    const first = this.lastMediaAt === 0;
    this.lastMediaAt = now;
    if (first) {
      this.failures = 0;
      this.publish('live');
    }
    return first;
  }

  takeAck(): number {
    if (this.subId == null || this.pendingAck <= 0) return 0;
    if (this.entry.sink.bufferedBytes() > CAMERA_STREAM_ACK_THRESHOLD_BYTES) return 0;
    const bytes = this.pendingAck;
    this.pendingAck = 0;
    return bytes;
  }

  stalled(now: number, stallMs: number): boolean {
    if (this.subId == null) return false;
    if (this.entry.sink.bufferedBytes() > CAMERA_STREAM_ACK_THRESHOLD_BYTES) return false;
    const since = this.lastMediaAt || this.startedAt;
    return since > 0 && now - since >= stallMs;
  }
}
