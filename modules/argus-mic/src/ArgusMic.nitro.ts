import { type HybridObject } from 'react-native-nitro-modules';

export interface ArgusMic extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  start(sampleRate: number): void;
  stop(): void;
  playerStart(sampleRate: number): void;
  playerWrite(pcm: ArrayBuffer): void;
  playerFlush(): void;
  playerStop(): void;
  playedSamples(): number;
  onData: ((pcm: ArrayBuffer | null) => void) | null;
  onError: ((code: string, message: string) => void) | null;
  onPlayerIdle: (() => void) | null;
}
