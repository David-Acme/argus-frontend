import { View } from 'react-native';
import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraSupportLevel } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Chip } from '@/shared/ui/chip';
import type { ChipTone } from '@/shared/ui/chip';
import { Cluster, Inline, Stack } from '@/shared/ui/layout';
import { Text } from '@/shared/ui/text';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import { catalogLabel, supportOf } from '@/features/cameras/model/camera-catalog';
import {
  argusAbilities,
  catalogSpecLines,
  sourceHost,
} from '@/features/cameras/model/camera-catalog-specs';
import { ABILITY_LABEL, SUPPORT_HINT, SUPPORT_LABEL } from '@/features/cameras/model/camera-labels';

export type ModelDetailProps = { model: ICameraCatalogModel };

type SupportChipProps = { support: CameraSupportLevel };

type SpecListProps = { model: ICameraCatalogModel };

export const SUPPORT_TONE: Record<CameraSupportLevel, ChipTone> = {
  full: 'ok',
  control: 'ok',
  video: 'attn',
  none: 'alert',
};

export function SupportChip({ support }: SupportChipProps) {
  const { t } = useTranslation();
  return <Chip label={t(SUPPORT_LABEL[support])} tone={SUPPORT_TONE[support]} dot />;
}

function SpecList({ model }: SpecListProps) {
  const { t } = useTranslation();
  const lines = catalogSpecLines(model, t);
  if (lines.length === 0) return null;
  return (
    <Stack gap={2}>
      <Text variant="label" tone="2">
        {t('screens.cameras.catalog.specs')}
      </Text>
      {lines.map((line) => (
        <Inline key={line.label} gap={3} justify="between" align="start">
          <Text variant="meta" tone="2">
            {line.label}
          </Text>
          <View className="min-w-0 flex-1 items-end">
            <Text variant="meta">{line.value}</Text>
          </View>
        </Inline>
      ))}
    </Stack>
  );
}

export function ModelDetail({ model }: ModelDetailProps) {
  const { t } = useTranslation();
  const support = supportOf(model);
  const host = sourceHost(model.source);
  const abilities = support === 'none' ? [] : argusAbilities(model);
  return (
    <View className="rounded-card bg-fill gap-4 p-4">
      <Inline gap={3} align="center">
        <CameraIllustration
          formFactor={model.formFactor}
          look={model.look}
          size={88}
          label={catalogLabel(model)}
        />
        <View className="min-w-0 flex-1 gap-2">
          <Text variant="rowTitle">{catalogLabel(model)}</Text>
          <Cluster gap={2}>
            <SupportChip support={support} />
            {model.tested ? (
              <Chip label={t('screens.cameras.catalog.tested')} icon="shieldok" />
            ) : null}
          </Cluster>
        </View>
      </Inline>
      <Text variant="meta">{t(SUPPORT_HINT[support])}</Text>
      {abilities.length > 0 ? (
        <Cluster gap={2}>
          {abilities.map(({ ability, available }) => (
            <Chip
              key={ability}
              label={t(ABILITY_LABEL[ability])}
              icon={available ? 'check' : 'x'}
              tone={available ? 'ok' : 'default'}
            />
          ))}
        </Cluster>
      ) : null}
      <SpecList model={model} />
      {host ? (
        <Text variant="caption" tone="3">
          {t('screens.cameras.catalog.source', { host })}
        </Text>
      ) : null}
    </View>
  );
}
