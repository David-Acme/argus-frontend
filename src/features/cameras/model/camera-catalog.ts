import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraDriverKind, CameraSupportLevel } from '@/core/types';

export type CatalogKind = 'indoor' | 'outdoor' | 'moving' | 'doorbell';

export type CatalogFilter = {
  query: string;
  brand: string | null;
  kind: CatalogKind | null;
};

export type CatalogPrefill = {
  catalogId: string;
  driver: CameraDriverKind;
  port: string;
  username: string;
  manufacturer: string;
  model: string;
  streamPath: string;
  subStreamPath: string;
};

export type CatalogLookup = {
  catalogId: string;
  driver: CameraDriverKind;
  model: string;
};

export const CATALOG_KINDS: readonly CatalogKind[] = ['indoor', 'outdoor', 'moving', 'doorbell'];

const DRIVER_SUPPORT: Record<CameraDriverKind, CameraSupportLevel> = {
  tapo: 'full',
  onvif: 'control',
  rtsp: 'video',
};

const SUPPORT_RANK: Record<CameraSupportLevel, number> = { full: 0, control: 1, video: 2, none: 4 };

export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function tokensOf(text: string): string[] {
  return foldText(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function catalogLabel(model: ICameraCatalogModel): string {
  return model.generic ? model.brand : `${model.brand} ${model.model}`;
}

export function supportOf(model: ICameraCatalogModel): CameraSupportLevel {
  return model.support ?? DRIVER_SUPPORT[model.driver];
}

export function connectable(model: ICameraCatalogModel): boolean {
  return supportOf(model) !== 'none';
}

function movesItself(model: ICameraCatalogModel): boolean {
  return (
    model.features.ptz || (model.specs?.panDeg ?? 0) > 0 || model.formFactor.includes('pan-tilt')
  );
}

function matchesKind(model: ICameraCatalogModel, kind: CatalogKind | null): boolean {
  if (kind == null) return true;
  if (kind === 'doorbell') return model.formFactor === 'doorbell';
  if (kind === 'moving') return movesItself(model);
  if (model.generic) return false;
  return kind === 'outdoor' ? model.outdoor : !model.outdoor;
}

function rankOf(model: ICameraCatalogModel): number {
  return SUPPORT_RANK[supportOf(model)] + (model.generic ? 3 : 0);
}

function matchesQuery(model: ICameraCatalogModel, query: string): boolean {
  const needles = tokensOf(query);
  if (needles.length === 0) return true;
  const haystack = tokensOf(`${model.brand} ${model.manufacturer} ${model.model} ${model.id}`).join(
    ' '
  );
  return needles.every((needle) => haystack.includes(needle));
}

export function filterCatalog(
  models: readonly ICameraCatalogModel[],
  filter: CatalogFilter
): ICameraCatalogModel[] {
  const matching = models.filter(
    (model) =>
      matchesQuery(model, filter.query) &&
      (filter.brand == null || model.brand === filter.brand) &&
      matchesKind(model, filter.kind)
  );
  return [...matching].sort((left, right) => rankOf(left) - rankOf(right));
}

export function catalogBrands(models: readonly ICameraCatalogModel[]): string[] {
  return [
    ...new Set(models.filter((model) => model.manufacturer !== '').map((model) => model.brand)),
  ];
}

export function catalogPrefill(model: ICameraCatalogModel): CatalogPrefill {
  return {
    catalogId: model.id,
    driver: model.driver,
    port: String(model.defaults.port),
    username: model.defaults.username,
    manufacturer: model.manufacturer,
    model: model.model,
    streamPath: model.driver === 'tapo' ? '' : model.defaults.streamPath,
    subStreamPath: model.driver === 'tapo' ? '' : model.defaults.subStreamPath,
  };
}

export function findCatalogModel(
  models: readonly ICameraCatalogModel[],
  { catalogId, driver, model }: CatalogLookup
): ICameraCatalogModel | null {
  const byId = models.find((entry) => entry.id === catalogId && entry.driver === driver);
  if (byId) return byId;
  const words = new Set(tokensOf(model));
  return (
    models.find(
      (entry) => !entry.generic && entry.driver === driver && words.has(foldText(entry.model))
    ) ?? null
  );
}

export function megapixelsOf(resolution: string): string {
  const [width, height] = resolution.split('x').map(Number);
  if (!width || !height) return '';
  const pixels = (width * height) / 1_000_000;
  return pixels < 2.5 ? `${height}p` : `${Math.round(pixels)} MP`;
}
