export interface IVoiceStartPayload {
  sessionId?: string;
  sampleRate: number;
}

export interface IVoiceSttPayload {
  text: string;
  final: boolean;
}

export interface IVoiceAssistantPayload {
  text: string;
}

export interface IVoiceDonePayload {
  sessionId: string;
}

export interface IVoiceErrorPayload {
  status?: number;
  error?: string;
}

export interface IVoiceAnswerPayload {
  text: string;
}
export interface IVoiceMic {
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
