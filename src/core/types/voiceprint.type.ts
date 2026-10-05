export interface RecognizedVoice {
  userId: number;
  since: number;
  updatedAt: number;
}

export interface VoiceprintDirectory {
  available: boolean;
  recognized: RecognizedVoice[];
}

export interface BiometricErasure {
  faces: number;
  portraits: number;
  voiceProfile: boolean;
  voiceSamples: number;
}
