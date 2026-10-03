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