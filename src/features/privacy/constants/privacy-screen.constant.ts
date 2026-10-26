import type { PrivacySignal, TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export type SignalLook = { icon: IconGlyph; title: TranslationKey; hint: TranslationKey };

export const PRIVACY_SIGNAL_LOOK: Readonly<Record<PrivacySignal, SignalLook>> = {
  presence: {
    icon: 'home',
    title: 'screens.privacy.signal.presence',
    hint: 'screens.privacy.signal-hint.presence',
  },
  faceCameras: {
    icon: 'face',
    title: 'screens.privacy.signal.faceCameras',
    hint: 'screens.privacy.signal-hint.faceCameras',
  },
  voiceLearning: {
    icon: 'mic',
    title: 'screens.privacy.signal.voiceLearning',
    hint: 'screens.privacy.signal-hint.voiceLearning',
  },
  cameraAudio: {
    icon: 'ear',
    title: 'screens.privacy.signal.cameraAudio',
    hint: 'screens.privacy.signal-hint.cameraAudio',
  },
};
