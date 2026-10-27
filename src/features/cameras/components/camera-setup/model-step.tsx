import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ICameraCatalogModel } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { FilterChip } from '@/shared/ui/chip';
import { Field } from '@/shared/ui/field';
import { Icon } from '@/shared/ui/icon';
import { Cluster, Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Text } from '@/shared/ui/text';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import { ModelDetail, SupportChip } from '@/features/cameras/components/camera-setup/model-detail';
import type { CameraSetup } from '@/features/cameras/hooks/use-camera-setup';
import {
  CATALOG_KINDS,
  catalogBrands,
  catalogLabel,
  filterCatalog,
  megapixelsOf,
  supportOf,
} from '@/features/cameras/model/camera-catalog';
import type { CatalogKind } from '@/features/cameras/model/camera-catalog';
import { FORM_FACTOR_LABEL, KIND_LABEL } from '@/features/cameras/model/camera-labels';

export type ModelStepProps = { setup: CameraSetup };

type ModelRowsProps = {
  models: readonly ICameraCatalogModel[];
  previewId: string;
  onPreview: (model: ICameraCatalogModel) => void;
};

type CatalogFilterState = ReturnType<typeof useCatalogFilter>;

type CatalogFiltersProps = { filter: CatalogFilterState };

type ChipRowProps = { label: string; children: ReactNode };

function useModelMeta() {
  const { t } = useTranslation();
  return (model: ICameraCatalogModel) => {
    if (model.generic) return t('screens.cameras.catalog.generic');
    const fov = model.specs && model.specs.fovDeg > 0 ? `${model.specs.fovDeg}°` : '';
    return [t(FORM_FACTOR_LABEL[model.formFactor]), megapixelsOf(model.resolution), fov]
      .filter(Boolean)
      .join(' · ');
  };
}

function ModelRows({ models, previewId, onPreview }: ModelRowsProps) {
  const metaOf = useModelMeta();
  return models.map((model) => (
    <View key={model.id} className="gap-2">
      <Row
        leading={<CameraIllustration formFactor={model.formFactor} look={model.look} size={48} />}
        title={catalogLabel(model)}
        meta={metaOf(model)}
        metaTone={supportOf(model) === 'none' ? '3' : undefined}
        trailing={
          model.id === previewId ? (
            <Icon name="check" size="small" tone="accent" />
          ) : (
            <SupportChip support={supportOf(model)} />
          )
        }
        onPress={() => onPreview(model)}
      />
      {model.id === previewId ? <ModelDetail model={model} /> : null}
    </View>
  ));
}

function useCatalogFilter(models: readonly ICameraCatalogModel[]) {
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState<string | null>(null);
  const [kind, setKind] = useState<CatalogKind | null>(null);
  const visible = filterCatalog(models, { query, brand, kind });
  const clear = () => {
    setQuery('');
    setBrand(null);
    setKind(null);
  };
  return {
    query,
    setQuery,
    brand,
    setBrand,
    kind,
    setKind,
    brands: catalogBrands(models),
    visible,
    clear,
  };
}

function ChipRow({ label, children }: ChipRowProps) {
  return (
    <View role="group" aria-label={label}>
      <Cluster gap={2}>{children}</Cluster>
    </View>
  );
}

function CatalogFilters({ filter }: CatalogFiltersProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={2}>
      <ChipRow label={t('screens.cameras.catalog.brand')}>
        <FilterChip
          label={t('screens.cameras.catalog.all-brands')}
          selected={filter.brand == null}
          onPress={() => filter.setBrand(null)}
        />
        {filter.brands.map((name) => (
          <FilterChip
            key={name}
            label={name}
            selected={filter.brand === name}
            onPress={() => filter.setBrand(filter.brand === name ? null : name)}
          />
        ))}
      </ChipRow>
      <ChipRow label={t('screens.cameras.catalog.form')}>
        {CATALOG_KINDS.map((value) => (
          <FilterChip
            key={value}
            label={t(KIND_LABEL[value])}
            selected={filter.kind === value}
            onPress={() => filter.setKind(filter.kind === value ? null : value)}
          />
        ))}
      </ChipRow>
    </Stack>
  );
}

export function ModelStep({ setup }: ModelStepProps) {
  const { t } = useTranslation();
  const { models, loading, failed, reload } = setup.catalog;
  const filter = useCatalogFilter(models);
  const { visible } = filter;
  if (models.length === 0 && failed)
    return (
      <Notice
        icon="wifioff"
        title={t('screens.cameras.catalog.failed')}
        action={{ label: t('screens.cameras.stage.retry'), onPress: reload }}
      />
    );
  if (models.length === 0 || loading)
    return (
      <Stack gap={1}>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </Stack>
    );
  return (
    <Stack gap={3}>
      <Field
        placeholder={t('screens.cameras.catalog.search')}
        value={filter.query}
        onChangeText={filter.setQuery}
      />
      <CatalogFilters filter={filter} />
      <Text variant="meta" tone="2">
        {t('screens.cameras.catalog.hint')}
      </Text>
      {visible.length === 0 ? (
        <Notice
          icon="search"
          title={t('screens.cameras.catalog.no-match')}
          body={t('screens.cameras.catalog.no-match-hint')}
          action={{ label: t('screens.cameras.catalog.clear'), onPress: filter.clear }}
        />
      ) : (
        <Stack gap={1}>
          <ModelRows
            models={visible}
            previewId={setup.previewModel?.id ?? ''}
            onPreview={setup.preview}
          />
        </Stack>
      )}
    </Stack>
  );
}
