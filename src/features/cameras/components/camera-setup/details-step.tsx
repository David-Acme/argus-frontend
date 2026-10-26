import { Controller } from 'react-hook-form';
import type { CameraRecordMode, TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import { Cluster, Stack } from '@/shared/ui/layout';
import { Row } from '@/shared/ui/row';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import { SetupField } from '@/features/cameras/components/camera-setup/setup-field';
import type { CameraSetup } from '@/features/cameras/hooks/use-camera-setup';
import { recordModeLabelKey, recordModeOptions } from '@/features/cameras/model/camera-record-mode';
import {
  RETENTION_DEFAULT_DAYS,
  retentionWithIncident,
} from '@/features/cameras/model/camera-retention';

export type DetailsStepProps = { setup: CameraSetup };

const NAME_SUGGESTIONS = [
  'screens.cameras.suggest-entrance',
  'screens.cameras.suggest-yard',
  'screens.cameras.suggest-garage',
  'screens.cameras.suggest-living-room',
  'screens.cameras.suggest-kitchen',
  'screens.cameras.suggest-hallway',
] as const satisfies readonly TranslationKey[];

function NameSuggestions({ setup }: DetailsStepProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={2}>
      <Text variant="meta">{t('screens.cameras.name-suggestions')}</Text>
      <Cluster gap={2}>
        {NAME_SUGGESTIONS.map((key) => (
          <Button
            key={key}
            compact
            variant="secondary"
            label={t(key)}
            onPress={() =>
              setup.form.setValue('name', t(key), { shouldValidate: true, shouldDirty: true })
            }
          />
        ))}
      </Cluster>
    </Stack>
  );
}

function RecordChoice({ setup }: DetailsStepProps) {
  const { t } = useTranslation();
  const records = recordModeOptions().map((mode) => ({
    value: mode,
    label: t(recordModeLabelKey(mode)),
  }));
  return (
    <Controller
      control={setup.form.control}
      name="recordMode"
      render={({ field }) => (
        <Stack gap={2}>
          <Choice<CameraRecordMode>
            look="field"
            label={t('screens.cameras.form.record-mode')}
            options={records}
            value={field.value}
            onChange={field.onChange}
          />
          <Text variant="meta">
            {field.value === 'continuous'
              ? t('screens.cameras.record-continuous-cost')
              : t('screens.cameras.record-cost-note')}
          </Text>
        </Stack>
      )}
    />
  );
}

function IncidentRow({ setup }: DetailsStepProps) {
  const { t } = useTranslation();
  const { form } = setup;
  return (
    <Controller
      control={form.control}
      name="retentionIncident"
      render={({ field }) => (
        <Row
          title={t('screens.cameras.retention.incident')}
          meta={t('screens.cameras.retention.incident-hint')}
          trailing={
            <Switch
              value={field.value}
              label={t('screens.cameras.retention.incident')}
              onValueChange={(next) => {
                field.onChange(next);
                const days = form.getValues('retentionDays');
                const clamped = retentionWithIncident(days, next);
                if (clamped !== days) form.setValue('retentionDays', clamped);
                void form.trigger('retentionDays');
              }}
            />
          }
        />
      )}
    />
  );
}

export function DetailsStep({ setup }: DetailsStepProps) {
  const { t } = useTranslation();
  const { form } = setup;
  return (
    <Stack gap={4}>
      <SetupField
        control={form.control}
        name="name"
        label={t('screens.cameras.form.name')}
        placeholder={t('screens.cameras.form.name-placeholder')}
      />
      <NameSuggestions setup={setup} />
      <RecordChoice setup={setup} />
      <SetupField
        control={form.control}
        name="retentionDays"
        label={t('screens.cameras.retention.label')}
        placeholder={String(RETENTION_DEFAULT_DAYS)}
        hint={t('screens.cameras.retention.hint')}
        content="number"
      />
      <IncidentRow setup={setup} />
    </Stack>
  );
}
