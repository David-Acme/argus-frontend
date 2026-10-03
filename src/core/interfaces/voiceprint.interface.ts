import type { VoiceRecording } from '@/core/types';

export interface IVoiceRecorder {
  supported(): Promise<boolean>;
  start(onLevel: (level: number) => void): Promise<void>;
  stop(): Promise<VoiceRecording>;
  cancel(): void;
}
