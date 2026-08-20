import { type HybridObject } from 'react-native-nitro-modules';

/**
 * Micrófono PCM nativo en streaming. Emite chunks s16le mono 16 kHz por
 * callback `onData` (baja latencia para STT por el socket unificado).
 */
export interface ArgusMic extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  start(sampleRate: number): void;
  stop(): void;
  /** Chunk PCM s16le mono. `null` cuando se liberó. */
  onData: ((pcm: ArrayBuffer | null) => void) | null;
  /** Errores estructurados `CODE|message` (MIC_PERMISSION_DENIED, MIC_UNAVAILABLE, ...). */
  onError: ((code: string, message: string) => void) | null;
}