import { memo, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraFeatureKey, CameraFormFactor, TranslationKey } from '@/core/types';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import {
  CATALOG_FEATURE_FILTERS,
  catalogBrands,
  catalogLabel,
  filterCatalog,
  megapixelsOf,
  presentFormFactors,
} from '@/features/cameras/model/camera-catalog';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { FilterChips, type FilterChipOption } from '@/shared/components/ui/filter-chips';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraModelPickerProps = {
  models: readonly ICameraCatalogModel[];
  loading: boolean;
  failed: boolean;
  selectedId: string;
  onSelect: (model: ICameraCatalogModel) => void;
  onRetry: () => void;
};

type ModelCardProps = {
  model: ICameraCatalogModel;
  selected: boolean;
  onSelect: (model: ICameraCatalogModel) => void;
};

const ALL = 'all';

const RESULTS_MIN_HEIGHT = 360;

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

const CARD_FEATURES: readonly CameraFeatureKey[] = ['ptz', 'speaker', 'siren'];

function pickerColumns(width: number): number {
  if (width >= 760) return 4;
  if (width >= 520) return 3;
  return 2;
}

const ModelCard = memo(function ModelCard({ model, selected, onSelect }: ModelCardProps) {
  const { t } = useTranslation();
  const features = CARD_FEATURES.filter((feature) => model.features[feature]);
  const detail = model.generic
    ? t('screens.cameras.catalog.generic')
    : [t(FORM_FACTOR_LABEL[model.formFactor]), megapixelsOf(model.resolution)]
        .filter(Boolean)
        .join(' · ');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={catalogLabel(model)}
      onPress={() => onSelect(model)}
      className={cn(
        'bg-surface-secondary dark:bg-card-secondary web:hover:opacity-90 flex-1 items-center gap-1.5 rounded-2xl border-2 px-2 pt-2 pb-3 active:opacity-80',
        selected ? 'border-accent' : 'border-transparent'
      )}>
      <CameraIllustration formFactor={model.formFactor} size={88} />
      <Text variant="label" numberOfLines={1} className="text-center">
        {model.generic ? model.brand : model.model}
      </Text>
      <Text variant="micro" numberOfLines={1} className="text-center">
        {model.generic ? detail : `${model.brand} · ${detail}`}
      </Text>
      {features.length > 0 ? (
        <View className="flex-row flex-wrap justify-center gap-1">
          {features.map((feature) => (
            <View key={feature} className="bg-card rounded-full px-2 py-0.5">
              <Text variant="micro">{t(FEATURE_LABEL[feature])}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
});

export function CameraModelPicker({
  models,
  loading,
  failed,
  selectedId,
  onSelect,
  onRetry,
}: CameraModelPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState<string>(ALL);
  const [formFactor, setFormFactor] = useState<CameraFormFactor | typeof ALL>(ALL);
  const [feature, setFeature] = useState<CameraFeatureKey | null>(null);

  const brandOptions = useMemo<FilterChipOption<string>[]>(
    () => [
      { value: ALL, label: t('screens.cameras.catalog.all-brands') },
      ...catalogBrands(models).map((name) => ({ value: name, label: name })),
    ],
    [models, t]
  );
  const formOptions = useMemo<FilterChipOption<CameraFormFactor | typeof ALL>[]>(
    () => [
      { value: ALL, label: t('screens.cameras.catalog.all-forms') },
      ...presentFormFactors(models).map((value) => ({ value, label: t(FORM_FACTOR_LABEL[value]) })),
    ],
    [models, t]
  );
  const featureOptions = useMemo<FilterChipOption<CameraFeatureKey>[]>(
    () => CATALOG_FEATURE_FILTERS.map((value) => ({ value, label: t(FEATURE_LABEL[value]) })),
    [t]
  );
  const visible = useMemo(
    () =>
      filterCatalog(models, {
        query,
        brand: brand === ALL ? null : brand,
        formFactor: formFactor === ALL ? null : formFactor,
        feature,
      }),
    [brand, feature, formFactor, models, query]
  );

  const clear = () => {
    setQuery('');
    setBrand(ALL);
    setFormFactor(ALL);
    setFeature(null);
  };

  if (models.length === 0) {
    return (
      <EmptyState
        variant="panel"
        icon={failed ? 'wifi-off' : 'loader-circle'}
        title={failed ? t('screens.cameras.catalog.failed') : t('screens.cameras.catalog.loading')}
        action={
          failed ? (
            <Button variant="outline" onPress={onRetry}>
              <Text>{t('screens.cameras.live.retry')}</Text>
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <View className="gap-3">
      <View className="justify-center">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('screens.cameras.catalog.search')}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('screens.cameras.catalog.search')}
          className="pl-10"
        />
        <View pointerEvents="none" className="absolute left-3.5">
          <Icon
            name={loading ? 'loader-circle' : 'search'}
            className="text-muted-foreground size-4"
          />
        </View>
      </View>
      <FilterChips options={brandOptions} value={brand} onChange={setBrand} scroll />
      <FilterChips options={formOptions} value={formFactor} onChange={setFormFactor} scroll />
      <FilterChips
        options={featureOptions}
        value={feature}
        onChange={(value) => setFeature((current) => (current === value ? null : value))}
        scroll
      />
      <View style={{ minHeight: RESULTS_MIN_HEIGHT }}>
        {visible.length === 0 ? (
          <EmptyState
            variant="panel"
            icon="search"
            title={t('screens.cameras.catalog.no-match')}
            hint={t('screens.cameras.catalog.no-match-hint')}
            action={
              <Button variant="outline" onPress={clear}>
                <Text>{t('screens.cameras.catalog.clear')}</Text>
              </Button>
            }
          />
        ) : (
          <ResponsiveGrid
            id="camera-catalog"
            items={visible}
            keyOf={(model) => model.id}
            renderItem={(model) => (
              <ModelCard model={model} selected={model.id === selectedId} onSelect={onSelect} />
            )}
            columnsFor={(width) => pickerColumns(width)}
            gap={10}
          />
        )}
      </View>
    </View>
  );
}
