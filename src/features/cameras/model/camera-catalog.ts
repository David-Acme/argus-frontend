import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraDriverKind, CameraFeatureKey, CameraFormFactor } from '@/core/types';

export type CatalogFilter = {
  query: string;
  brand: string | null;
  formFactor: CameraFormFactor | null;
  feature: CameraFeatureKey | null;
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

export const CATALOG_FORM_FACTORS: readonly CameraFormFactor[] = [
  'pan-tilt',
  'cube',
  'bullet',
  'outdoor-pan-tilt',
  'turret',
  'dome',
  'doorbell',
];

export const CATALOG_FEATURE_FILTERS: readonly CameraFeatureKey[] = ['ptz', 'speaker', 'siren', 'privacy'];

export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function tokensOf(text: string): string[] {
  return foldText(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function catalogLabel(model: ICameraCatalogModel): string {
  return model.generic ? model.brand : `${model.brand} ${model.model}`;
}

function matchesQuery(model: ICameraCatalogModel, query: string): boolean {
  const needles = tokensOf(query);
  if (needles.length === 0) return true;
  const haystack = tokensOf(`${model.brand} ${model.manufacturer} ${model.model} ${model.id}`).join(' ');
  return needles.every((needle) => haystack.includes(needle));
}

export function filterCatalog(models: readonly ICameraCatalogModel[], filter: CatalogFilter): ICameraCatalogModel[] {
  const matching = models.filter(
    (model) =>
      matchesQuery(model, filter.query) &&
      (filter.brand == null || model.brand === filter.brand) &&
      (filter.formFactor == null || model.formFactor === filter.formFactor) &&
      (filter.feature == null || model.features[filter.feature] === true),
  );
  return [...matching].sort((left, right) => Number(left.generic) - Number(right.generic));
}

export function catalogBrands(models: readonly ICameraCatalogModel[]): string[] {
  return [...new Set(models.map((model) => model.brand))];
}

export function presentFormFactors(models: readonly ICameraCatalogModel[]): CameraFormFactor[] {
  const present = new Set(models.map((model) => model.formFactor));
  return CATALOG_FORM_FACTORS.filter((formFactor) => present.has(formFactor));
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
  { catalogId, driver, model }: CatalogLookup,
): ICameraCatalogModel | null {
  const byId = models.find((entry) => entry.id === catalogId && entry.driver === driver);
  if (byId) return byId;
  const words = new Set(tokensOf(model));
  return (
    models.find((entry) => !entry.generic && entry.driver === driver && words.has(foldText(entry.model))) ?? null
  );
}

export function formFactorOf(models: readonly ICameraCatalogModel[], lookup: CatalogLookup): CameraFormFactor {
  return findCatalogModel(models, lookup)?.formFactor ?? (lookup.driver === 'tapo' ? 'pan-tilt' : 'bullet');
}

export function megapixelsOf(resolution: string): string {
  const [width, height] = resolution.split('x').map(Number);
  if (!width || !height) return '';
  const pixels = (width * height) / 1_000_000;
  return pixels < 2.5 ? `${height}p` : `${Math.round(pixels)} MP`;
}
