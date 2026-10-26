import { useState } from 'react';
import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraFeatureKey, CameraFormFactor } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice } from '@/shared/ui/choice';
import type { ChoiceOption } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Icon } from '@/shared/ui/icon';
import { Inline, Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Text } from '@/shared/ui/text';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import type { CameraSetup } from '@/features/cameras/hooks/use-camera-setup';
import {
  CATALOG_FEATURE_FILTERS,
  catalogBrands,
  catalogLabel,
  filterCatalog,
  megapixelsOf,
  presentFormFactors,
} from '@/features/cameras/model/camera-catalog';
import { FEATURE_LABEL, FORM_FACTOR_LABEL } from '@/features/cameras/model/camera-labels';

export type ModelStepProps = { setup: CameraSetup };

type ModelRowsProps = {
  models: readonly ICameraCatalogModel[];
  selectedId: string;
  onSelect: (model: ICameraCatalogModel) => void;
};

const ALL = 'all';

function ModelRows({ models, selectedId, onSelect }: ModelRowsProps) {
  const { t } = useTranslation();
  return models.map((model) => (
    <Row
      key={model.id}
      leading={<CameraIllustration formFactor={model.formFactor} size={48} />}
      title={model.generic ? model.brand : catalogLabel(model)}
      meta={
        model.generic
          ? t('screens.cameras.catalog.generic')
          : [t(FORM_FACTOR_LABEL[model.formFactor]), megapixelsOf(model.resolution)]
              .filter(Boolean)
              .join(' · ')
      }
      trailing={
        model.id === selectedId ? <Icon name="check" size="small" tone="accent" /> : undefined
      }
      onPress={() => onSelect(model)}
    />
  ));
}

type CatalogFilter = ReturnType<typeof useCatalogFilter>;

type CatalogFiltersProps = { filter: CatalogFilter };

function useCatalogFilter(models: readonly ICameraCatalogModel[]) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState<string>(ALL);
  const [form, setForm] = useState<CameraFormFactor | typeof ALL>(ALL);
  const [feature, setFeature] = useState<CameraFeatureKey | typeof ALL>(ALL);
  const brands: ChoiceOption<string>[] = [
    { value: ALL, label: t('screens.cameras.catalog.all-brands') },
    ...catalogBrands(models).map((name) => ({ value: name, label: name })),
  ];
  const forms: ChoiceOption<CameraFormFactor | typeof ALL>[] = [
    { value: ALL, label: t('screens.cameras.catalog.all-forms') },
    ...presentFormFactors(models).map((value) => ({ value, label: t(FORM_FACTOR_LABEL[value]) })),
  ];
  const features: ChoiceOption<CameraFeatureKey | typeof ALL>[] = [
    { value: ALL, label: t('screens.cameras.catalog.all-features') },
    ...CATALOG_FEATURE_FILTERS.map((value) => ({ value, label: t(FEATURE_LABEL[value]) })),
  ];
  const visible = filterCatalog(models, {
    query,
    brand: brand === ALL ? null : brand,
    formFactor: form === ALL ? null : form,
    feature: feature === ALL ? null : feature,
  });
  const clear = () => {
    setQuery('');
    setBrand(ALL);
    setForm(ALL);
    setFeature(ALL);
  };
  return {
    query,
    setQuery,
    brand,
    setBrand,
    form,
    setForm,
    feature,
    setFeature,
    brands,
    forms,
    features,
    visible,
    clear,
  };
}

function CatalogFilters({ filter }: CatalogFiltersProps) {
  const { t } = useTranslation();
  return (
    <>
      <Inline gap={2} fill>
        <Choice
          look="field"
          label={t('screens.cameras.catalog.brand')}
          options={filter.brands}
          value={filter.brand}
          onChange={filter.setBrand}
        />
        <Choice
          look="field"
          label={t('screens.cameras.catalog.form')}
          options={filter.forms}
          value={filter.form}
          onChange={filter.setForm}
        />
      </Inline>
      <Choice
        look="field"
        label={t('screens.cameras.catalog.feature')}
        options={filter.features}
        value={filter.feature}
        onChange={filter.setFeature}
      />
    </>
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
    <Stack gap={4}>
      <Text variant="meta">{t('screens.cameras.catalog.hint')}</Text>
      <Field
        placeholder={t('screens.cameras.catalog.search')}
        value={filter.query}
        onChangeText={filter.setQuery}
      />
      <CatalogFilters filter={filter} />
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
            selectedId={setup.selectedModel?.id ?? ''}
            onSelect={setup.chooseModel}
          />
        </Stack>
      )}
    </Stack>
  );
}
