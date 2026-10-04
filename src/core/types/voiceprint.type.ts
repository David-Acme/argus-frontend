export interface RecognizedVoice {
  userId: number;
  since: number;
  updatedAt: number;
}

export interface VoiceprintDirectory {
  available: boolean;
  recognized: RecognizedVoice[];
}
