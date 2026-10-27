import type { ICameraCatalogModel, ICameraCatalogSpecs } from '@/core/interfaces';
import type { CameraPowerKind, TranslateFn, TranslationKey } from '@/core/types';
import { megapixelsOf, supportOf } from '@/features/cameras/model/camera-catalog';

export type SpecLine = { label: string; value: string };

export type ArgusAbility = 'live' | 'detect' | 'listen' | 'talk' | 'move' | 'siren' | 'events';

export type AbilityLine = { ability: ArgusAbility; available: boolean };

const POWER_LABEL = {
  adapter: 'screens.cameras.catalog.power-adapter',
  poe: 'screens.cameras.catalog.power-poe',
  'adapter-poe': 'screens.cameras.catalog.power-adapter-poe',
  battery: 'screens.cameras.catalog.power-battery',
  'doorbell-wiring': 'screens.cameras.catalog.power-doorbell',
  'battery-wiring': 'screens.cameras.catalog.power-battery-wiring',
} as const satisfies Record<CameraPowerKind, TranslationKey>;

function resolutionValue(resolution: string): string {
  const size = resolution.replace('x', '×');
  const label = megapixelsOf(resolution);
  return label ? `${label} · ${size}` : size;
}

function nightValue(specs: ICameraCatalogSpecs, t: TranslateFn): string {
  const range = t('screens.cameras.catalog.spec-night-value', { meters: specs.nightVisionM });
  return specs.colorNight ? `${range} · ${t('screens.cameras.catalog.spec-night-color')}` : range;
}

function movementValue(specs: ICameraCatalogSpecs, t: TranslateFn): string {
  const parts = [t('screens.cameras.catalog.spec-pan-value', { degrees: specs.panDeg })];
  if (specs.tiltDeg > 0)
    parts.push(t('screens.cameras.catalog.spec-tilt-value', { degrees: specs.tiltDeg }));
  if (specs.opticalZoom > 1)
    parts.push(t('screens.cameras.catalog.spec-zoom-value', { zoom: specs.opticalZoom }));
  return parts.join(' · ');
}

function deterrenceValue(specs: ICameraCatalogSpecs, t: TranslateFn): string {
  return [
    specs.spotlight ? t('screens.cameras.catalog.spec-spotlight') : '',
    specs.siren ? t('screens.cameras.catalog.spec-siren') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function localValue(specs: ICameraCatalogSpecs, t: TranslateFn): string {
  const onvif = specs.onvifProfile
    ? t('screens.cameras.catalog.spec-onvif-profile', { profile: specs.onvifProfile })
    : 'ONVIF';
  const parts = [specs.rtsp ? 'RTSP' : '', specs.onvif ? onvif : ''].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : t('screens.cameras.catalog.spec-local-none');
}

function placeValue(
  model: ICameraCatalogModel,
  specs: ICameraCatalogSpecs,
  t: TranslateFn
): string {
  if (!model.outdoor) return t('screens.cameras.catalog.spec-indoor');
  const outdoor = t('screens.cameras.catalog.spec-outdoor');
  return specs.ipRating ? `${outdoor} · ${specs.ipRating}` : outdoor;
}

export function catalogSpecLines(model: ICameraCatalogModel, t: TranslateFn): SpecLine[] {
  const { specs } = model;
  if (model.generic || !specs) return [];
  const line = (label: TranslationKey, value: string): SpecLine => ({ label: t(label), value });
  const lines = [
    model.resolution
      ? line('screens.cameras.catalog.spec-resolution', resolutionValue(model.resolution))
      : null,
    specs.fovDeg > 0 ? line('screens.cameras.catalog.spec-fov', `${specs.fovDeg}°`) : null,
    specs.nightVisionM > 0
      ? line('screens.cameras.catalog.spec-night', nightValue(specs, t))
      : null,
    specs.panDeg > 0
      ? line('screens.cameras.catalog.spec-movement', movementValue(specs, t))
      : null,
    specs.twoWayAudio
      ? line('screens.cameras.catalog.spec-audio', t('screens.cameras.catalog.spec-two-way'))
      : null,
    specs.spotlight || specs.siren
      ? line('screens.cameras.catalog.spec-deterrence', deterrenceValue(specs, t))
      : null,
    line('screens.cameras.catalog.spec-place', placeValue(model, specs, t)),
    line('screens.cameras.catalog.spec-power', t(POWER_LABEL[specs.power])),
    specs.storageGb > 0
      ? line(
          'screens.cameras.catalog.spec-storage',
          t('screens.cameras.catalog.spec-storage-value', { gb: specs.storageGb })
        )
      : null,
    line('screens.cameras.catalog.spec-local', localValue(specs, t)),
  ];
  return lines.filter((entry): entry is SpecLine => entry !== null);
}

function pansItself(model: ICameraCatalogModel): boolean {
  return (
    model.features.ptz ||
    (model.specs?.panDeg ?? 0) > 0 ||
    (model.generic && supportOf(model) === 'control')
  );
}

const HARDWARE: Partial<Record<ArgusAbility, (model: ICameraCatalogModel) => boolean>> = {
  listen: (model) => model.features.microphone || model.specs?.microphone !== false,
  talk: (model) => model.features.speaker || model.specs?.twoWayAudio === true,
  siren: (model) => model.features.siren || model.specs?.siren === true,
  move: pansItself,
};

function hasHardware(model: ICameraCatalogModel, ability: ArgusAbility): boolean {
  return HARDWARE[ability]?.(model) ?? true;
}

function drivenByArgus(model: ICameraCatalogModel, ability: ArgusAbility): boolean {
  const support = supportOf(model);
  if (support === 'none') return false;
  const full = support === 'full';
  if (ability === 'talk') return full && model.features.speaker;
  if (ability === 'siren') return full && model.features.siren;
  if (ability === 'move') return full ? model.features.ptz : support === 'control';
  if (ability === 'events') return full ? model.features.motion : support === 'control';
  return true;
}

const ABILITIES: readonly ArgusAbility[] = [
  'live',
  'detect',
  'listen',
  'talk',
  'move',
  'siren',
  'events',
];

export function argusAbilities(model: ICameraCatalogModel): AbilityLine[] {
  return ABILITIES.filter((ability) => hasHardware(model, ability)).map((ability) => ({
    ability,
    available: drivenByArgus(model, ability),
  }));
}

export function sourceHost(source: string): string {
  const match = /^https?:\/\/(?:www\.)?([^/]+)/.exec(source);
  return match?.[1] ?? '';
}
