import type { IVoiceMic } from '@/core/interfaces';
import { withTiming } from 'react-native-reanimated';
import { VOICE_ENVELOPE_ATTACK_MS, VOICE_ENVELOPE_RELEASE_MS, VOICE_ENVELOPE_WINDOW_MS } from '@/features/voice/constants/reaction';
import { VOICE_PLAYOUT_IDLE_GRACE_MS, VOICE_PLAYOUT_STALL_MS, VOICE_SAMPLE_RATE } from '@/features/voice/constants/voice';
import { pcmChunk } from '@/features/voice/model/pcm';
import { voiceLevel } from '@/features/voice/model/voice-level';
import { PlayoutEnvelope } from '@/features/voice/services/voice/voice-envelope';

const WINDOW_SAMPLES = Math.max(1, Math.round((VOICE_SAMPLE_RATE * VOICE_ENVELOPE_WINDOW_MS) / 1000));

export class VoicePlayout {
  private player: IVoiceMic | null = null;
  private envelope = new PlayoutEnvelope(WINDOW_SAMPLES);
  private playing = false;
  private stopWhenIdle = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPlayed = 0;
  private lastProgressAt = 0;
  private drainedSince: number | null = null;

  constructor(private readonly onIdle: () => void) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  attach(player: IVoiceMic): void {
    this.stop();
    this.player = player;
    this.stopWhenIdle = false;
    player.onPlayerIdle = () => this.markDrained();
    player.playerStart(VOICE_SAMPLE_RATE);
  }

  write(data: ArrayBuffer): void {
    const player = this.player;
    if (!player || data.byteLength < 2) return;
    player.playerWrite(data);
    this.envelope.append(pcmChunk(data));
    this.drainedSince = null;
    this.clearGrace();
    if (this.playing) return;
    this.playing = true;
    this.lastProgressAt = Date.now();
    this.startTimer();
  }

  flush(): void {
    this.player?.playerFlush();
    this.envelope.levelAt(this.envelope.writtenSamples);
    this.settle();
  }

  armIdle(): void {
    if (this.playing || !this.player) return;
    this.clearGrace();
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      if (!this.playing) this.onIdle();
    }, VOICE_PLAYOUT_IDLE_GRACE_MS);
  }

  drainThenStop(): void {
    if (!this.playing) {
      this.stop();
      return;
    }
    this.stopWhenIdle = true;
  }

  stop(): void {
    const player = this.player;
    this.player = null;
    this.stopWhenIdle = false;
    this.envelope.reset();
    this.settle();
    if (!player) return;
    player.onPlayerIdle = null;
    player.playerStop();
  }

  private markDrained(): void {
    if (!this.playing || !this.player) return;
    if (this.player.playedSamples() < this.envelope.writtenSamples) return;
    this.drainedSince ??= Date.now();
  }

  private tick(): void {
    const player = this.player;
    if (!player) return;
    const now = Date.now();
    const played = player.playedSamples();
    const written = this.envelope.writtenSamples;
    if (played !== this.lastPlayed) {
      this.lastPlayed = played;
      this.lastProgressAt = now;
    }
    if (played >= written) {
      this.drainedSince ??= now;
    }
    const drained = this.drainedSince !== null && now - this.drainedSince >= VOICE_PLAYOUT_IDLE_GRACE_MS;
    const stalled = played < written && now - this.lastProgressAt >= VOICE_PLAYOUT_STALL_MS;
    if (drained || stalled) {
      this.finish();
      return;
    }
    const target = this.envelope.levelAt(played);
    const duration = target >= voiceLevel.value ? VOICE_ENVELOPE_ATTACK_MS : VOICE_ENVELOPE_RELEASE_MS;
    voiceLevel.value = withTiming(target, { duration });
  }

  private finish(): void {
    this.settle();
    if (this.stopWhenIdle) this.stop();
    this.onIdle();
  }

  private settle(): void {
    this.playing = false;
    this.drainedSince = null;
    this.lastPlayed = 0;
    this.clearGrace();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    voiceLevel.value = withTiming(0, { duration: VOICE_ENVELOPE_RELEASE_MS });
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), VOICE_ENVELOPE_WINDOW_MS);
  }

  private clearGrace(): void {
    if (this.graceTimer === null) return;
    clearTimeout(this.graceTimer);
    this.graceTimer = null;
  }
}
