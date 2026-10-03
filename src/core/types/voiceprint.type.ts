export type VoiceprintMethod = 'self' | 'owner_face';

export type VoiceSampleProblem = 'too_short' | 'too_noisy' | 'clipped' | 'invalid' | 'unavailable';

export interface VoiceprintStatus {
  available: boolean;
  enrolled: boolean;
  stale: boolean;
  model: string;
  sampleCount: number;
  enrolledAt: number | null;
  method: VoiceprintMethod | null;
  consentVersion: string;
  samplesRequired: number;
  minSpeechSeconds: number;
}

export interface VoiceprintChallenge {
  challengeId: string;
  phrases: string[];
  expiresAt: number;
  lang: 'es' | 'en';
  consentVersion: string;
  samplesRequired: number;
  minSpeechSeconds: number;
}

export interface VoiceSampleCheck {
  accepted: boolean;
  problem: VoiceSampleProblem | null;
  speechSeconds: number;
  snrDb: number;
  minSpeechSeconds: number;
  minSnrDb: number;
  collected: number;
  required: number;
}

export interface VoiceprintVerification {
  matched: boolean;
  score: number;
  threshold: number;
}

export interface VoiceRecording {
  audio: string;
  seconds: number;
}
