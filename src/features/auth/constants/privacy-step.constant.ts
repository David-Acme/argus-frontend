import type { PrivacySignal, TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export type SignalCopy = { glyph: IconGlyph; title: TranslationKey; meta: TranslationKey };

export const SIGNAL_COPY: Readonly<Record<PrivacySignal, SignalCopy>> = {
  presence: {
    glyph: 'home',
    title: 'screens.welcome.privacy.signals.presence.title',
    meta: 'screens.welcome.privacy.signals.presence.meta',
  },
  faceCameras: {
    glyph: 'face',
    title: 'screens.welcome.privacy.signals.faceCameras.title',
    meta: 'screens.welcome.privacy.signals.faceCameras.meta',
  },
  voiceLearning: {
    glyph: 'mic',
    title: 'screens.welcome.privacy.signals.voiceLearning.title',
    meta: 'screens.welcome.privacy.signals.voiceLearning.meta',
  },
  cameraAudio: {
    glyph: 'ear',
    title: 'screens.welcome.privacy.signals.cameraAudio.title',
    meta: 'screens.welcome.privacy.signals.cameraAudio.meta',
  },
};
