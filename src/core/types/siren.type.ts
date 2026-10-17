export type SirenPhase = 'idle' | 'confirm' | 'countdown' | 'sounding';

export type SirenState = {
  phase: SirenPhase;
  secondsLeft: number;
  startedAt: number;
  until: number;
};

export type CameraSirenResult = {
  cameraId: number;
  enabled: boolean;
  until: number;
};
