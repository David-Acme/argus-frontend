import type { CameraFeatureKey, CameraFormFactor, TranslationKey } from '@/core/types';

export const FORM_FACTOR_LABEL = {
  'pan-tilt': 'screens.cameras.catalog.form-pan-tilt',
  'outdoor-pan-tilt': 'screens.cameras.catalog.form-outdoor-pan-tilt',
  cube: 'screens.cameras.catalog.form-cube',
  bullet: 'screens.cameras.catalog.form-bullet',
  turret: 'screens.cameras.catalog.form-turret',
  dome: 'screens.cameras.catalog.form-dome',
  doorbell: 'screens.cameras.catalog.form-doorbell',
} as const satisfies Record<CameraFormFactor, TranslationKey>;

export const FEATURE_LABEL = {
  ptz: 'screens.cameras.catalog.feature-ptz',
  presets: 'screens.cameras.catalog.feature-presets',
  autoTrack: 'screens.cameras.catalog.feature-auto-track',
  microphone: 'screens.cameras.catalog.feature-microphone',
  speaker: 'screens.cameras.catalog.feature-speaker',
  siren: 'screens.cameras.catalog.feature-siren',
  privacy: 'screens.cameras.catalog.feature-privacy',
  led: 'screens.cameras.catalog.feature-led',
  dayNight: 'screens.cameras.catalog.feature-day-night',
  motion: 'screens.cameras.catalog.feature-motion',
  sdCard: 'screens.cameras.catalog.feature-sd-card',
} as const satisfies Record<CameraFeatureKey, TranslationKey>;
