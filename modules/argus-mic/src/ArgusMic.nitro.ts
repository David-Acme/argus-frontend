import { type HybridObject } from 'react-native-nitro-modules';

export interface ArgusMic extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  start(sampleRate: number): void;
  stop(): void;
  onData: ((pcm: ArrayBuffer | null) => void) | null;
  onError: ((code: string, message: string) => void) | null;
}