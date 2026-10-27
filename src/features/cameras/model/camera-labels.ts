import type { CameraFormFactor, CameraSupportLevel, TranslationKey } from '@/core/types';
import type { CatalogKind } from '@/features/cameras/model/camera-catalog';
import type { ArgusAbility } from '@/features/cameras/model/camera-catalog-specs';

export const FORM_FACTOR_LABEL = {
  'pan-tilt': 'screens.cameras.catalog.form-pan-tilt',
  'outdoor-pan-tilt': 'screens.cameras.catalog.form-outdoor-pan-tilt',
  cube: 'screens.cameras.catalog.form-cube',
  bullet: 'screens.cameras.catalog.form-bullet',
  turret: 'screens.cameras.catalog.form-turret',
  dome: 'screens.cameras.catalog.form-dome',
  doorbell: 'screens.cameras.catalog.form-doorbell',
} as const satisfies Record<CameraFormFactor, TranslationKey>;

export const SUPPORT_LABEL = {
  full: 'screens.cameras.catalog.support-full',
  control: 'screens.cameras.catalog.support-control',
  video: 'screens.cameras.catalog.support-video',
  none: 'screens.cameras.catalog.support-none',
} as const satisfies Record<CameraSupportLevel, TranslationKey>;

export const SUPPORT_HINT = {
  full: 'screens.cameras.catalog.support-full-hint',
  control: 'screens.cameras.catalog.support-control-hint',
  video: 'screens.cameras.catalog.support-video-hint',
  none: 'screens.cameras.catalog.support-none-hint',
} as const satisfies Record<CameraSupportLevel, TranslationKey>;

export const ABILITY_LABEL = {
  live: 'screens.cameras.catalog.ability-live',
  detect: 'screens.cameras.catalog.ability-detect',
  listen: 'screens.cameras.catalog.ability-listen',
  talk: 'screens.cameras.catalog.ability-talk',
  move: 'screens.cameras.catalog.ability-move',
  siren: 'screens.cameras.catalog.ability-siren',
  events: 'screens.cameras.catalog.ability-events',
} as const satisfies Record<ArgusAbility, TranslationKey>;

export const KIND_LABEL = {
  indoor: 'screens.cameras.catalog.kind-indoor',
  outdoor: 'screens.cameras.catalog.kind-outdoor',
  moving: 'screens.cameras.catalog.kind-moving',
  doorbell: 'screens.cameras.catalog.kind-doorbell',
} as const satisfies Record<CatalogKind, TranslationKey>;
