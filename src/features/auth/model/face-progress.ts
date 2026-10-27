import type { FaceGuideState, TranslationKey } from '@/core/types';
import { FACE_TICK_COUNT } from '@/features/auth/constants/face.constant';

export type FacePhase = 'guide' | 'countdown' | 'submitting';

export type FaceProgressInput = {
  phase: FacePhase;
  guide: FaceGuideState | null;
  capturing: boolean;
  done: boolean;
};

export type FaceCueTone = 'calm' | 'ok' | 'attn';

export type FaceProgress = {
  progress: number;
  cue: TranslationKey;
  tone: FaceCueTone;
};

const HOLD = 0.5;

const CAPTURE = 0.75;

const SENDING = 0.9;

const GUIDE_CUE: Readonly<Record<Exclude<FaceGuideState, 'ready'>, TranslationKey>> = {
  'no-face': 'screens.face.cue.centre',
  'off-center': 'screens.face.cue.centre',
  'too-far': 'screens.face.cue.closer',
  'too-close': 'screens.face.cue.farther',
  'multiple-faces': 'screens.face.cue.alone',
  tilted: 'screens.face.cue.front',
  'eyes-closed': 'screens.face.cue.eyes',
  'low-light': 'screens.face.cue.light',
};

const ATTENTION: ReadonlySet<FaceGuideState> = new Set(['multiple-faces', 'low-light']);

export function faceProgressOf({ phase, guide, capturing, done }: FaceProgressInput): FaceProgress {
  if (done) return { progress: 1, cue: 'screens.face.cue.done', tone: 'ok' };
  if (phase === 'submitting')
    return { progress: SENDING, cue: 'screens.face.cue.almost', tone: 'ok' };
  if (phase === 'countdown' || capturing)
    return { progress: CAPTURE, cue: 'screens.face.cue.almost', tone: 'ok' };
  if (guide === 'ready') return { progress: HOLD, cue: 'screens.face.cue.almost', tone: 'ok' };
  const state = guide ?? 'no-face';
  return { progress: 0, cue: GUIDE_CUE[state], tone: ATTENTION.has(state) ? 'attn' : 'calm' };
}

export const litTicks = (progress: number): number =>
  Math.round(Math.max(0, Math.min(1, progress)) * FACE_TICK_COUNT);
