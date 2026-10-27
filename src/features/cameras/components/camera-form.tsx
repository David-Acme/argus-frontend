import type { ICameraCacheRow } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Inline, Stack } from '@/shared/ui/layout';
import { Sheet } from '@/shared/ui/sheet';
import { Text } from '@/shared/ui/text';
import { ConnectionStep } from '@/features/cameras/components/camera-setup/connection-step';
import { DetailsStep } from '@/features/cameras/components/camera-setup/details-step';
import { ModelStep } from '@/features/cameras/components/camera-setup/model-step';
import { ProbeStep } from '@/features/cameras/components/camera-setup/probe-step';
import { useCameraSetup } from '@/features/cameras/hooks/use-camera-setup';
import type { CameraSetup } from '@/features/cameras/hooks/use-camera-setup';
import { connectable } from '@/features/cameras/model/camera-catalog';
import type { CameraFormStep } from '@/features/cameras/model/camera-form-steps';

export type CameraFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera?: ICameraCacheRow | null;
};

type SetupSheetProps = { camera: ICameraCacheRow | null; onClose: () => void };

type StepsProps = { setup: CameraSetup };

const STEP_LABEL = {
  model: 'screens.cameras.steps.model',
  connection: 'screens.cameras.steps.connection',
  test: 'screens.cameras.steps.test',
  details: 'screens.cameras.steps.details',
} as const satisfies Record<CameraFormStep, TranslationKey>;

function Steps({ setup }: StepsProps) {
  const { t } = useTranslation();
  const index = setup.steps.indexOf(setup.step);
  return (
    <Inline gap={2} justify="between">
      {setup.back ? (
        <Button
          compact
          variant="ghost"
          icon="chevl"
          label={t('screens.cameras.steps.back')}
          onPress={setup.back}
        />
      ) : null}
      <Text variant="meta" tone="2">
        {t('screens.cameras.steps.position', {
          step: t(STEP_LABEL[setup.step]),
          index: String(Math.max(index, 0) + 1),
          total: String(setup.steps.length),
        })}
      </Text>
    </Inline>
  );
}

function primaryOf(setup: CameraSetup): TranslationKey {
  if (setup.step === 'details') return 'common.save';
  if (setup.step === 'test' && setup.probe.result && !setup.probe.result.ok)
    return 'screens.cameras.probe.continue-anyway';
  return 'screens.cameras.steps.next';
}

function SetupSheet({ camera, onClose }: SetupSheetProps) {
  const { t } = useTranslation();
  const setup = useCameraSetup(camera, onClose);
  const disabled =
    (setup.step === 'model' && !(setup.previewModel && connectable(setup.previewModel))) ||
    (setup.step === 'test' && setup.probe.running);
  return (
    <Sheet
      open
      onClose={onClose}
      title={camera ? t('screens.cameras.edit') : t('screens.cameras.connect')}
      variant="form"
      long
      dirty={setup.form.formState.isDirty ? (camera?.name ?? true) : false}
      actions={{ primary: { label: t(primaryOf(setup)), onPress: setup.next, disabled } }}>
      <Stack gap={4}>
        <Steps setup={setup} />
        {setup.step === 'model' ? <ModelStep setup={setup} /> : null}
        {setup.step === 'connection' ? <ConnectionStep setup={setup} /> : null}
        {setup.step === 'test' ? <ProbeStep probe={setup.probe} /> : null}
        {setup.step === 'details' ? <DetailsStep setup={setup} /> : null}
      </Stack>
    </Sheet>
  );
}

export function CameraForm({ open, onOpenChange, camera = null }: CameraFormProps) {
  if (!open) return null;
  return <SetupSheet camera={camera} onClose={() => onOpenChange(false)} />;
}
