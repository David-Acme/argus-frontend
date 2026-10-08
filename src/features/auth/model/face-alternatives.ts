import type { TranslationKey } from '@/core/types';

export type FaceAlternativeAction = 'login-qr' | 'back-to-start';

export type FaceAlternativesInput = {
  enrolling: boolean;
  stuck: boolean;
};

export type FaceAlternatives = {
  actions: readonly FaceAlternativeAction[];
  hint: TranslationKey | null;
};

export const FACE_ALTERNATIVE_LABEL_KEYS: Record<FaceAlternativeAction, TranslationKey> = {
  'login-qr': 'screens.face.qr-login',
  'back-to-start': 'screens.face.back-to-start',
};

export function faceAlternatives({ enrolling, stuck }: FaceAlternativesInput): FaceAlternatives {
  return {
    actions: enrolling ? ['back-to-start'] : ['login-qr', 'back-to-start'],
    hint: stuck ? 'screens.face.stuck-hint' : null,
  };
}
