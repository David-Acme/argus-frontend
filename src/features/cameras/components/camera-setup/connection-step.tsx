import { Controller, useWatch } from 'react-hook-form';
import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraDriverKind, TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Inline, Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import { SetupField } from '@/features/cameras/components/camera-setup/setup-field';
import { CAMERA_DRIVER_SPECS } from '@/features/cameras/constants';
import {
  STREAM_PATH_EXAMPLE,
  SUB_STREAM_PATH_EXAMPLE,
} from '@/features/cameras/constants/setup.constant';
import type { CameraSetup } from '@/features/cameras/hooks/use-camera-setup';
import { catalogLabel } from '@/features/cameras/model/camera-catalog';
import { FORM_FACTOR_LABEL } from '@/features/cameras/model/camera-labels';
import { credentialsToRetype } from '@/features/cameras/model/camera-retention';

export type ConnectionStepProps = { setup: CameraSetup };

type ModelRowProps = {
  model: ICameraCatalogModel | null;
  driver: CameraDriverKind;
  onChange: () => void;
};

type RetypeProps = { setup: CameraSetup; cloud: boolean };

const DRIVER_LABEL = {
  tapo: 'screens.cameras.driver-tapo',
  onvif: 'screens.cameras.driver-onvif',
  rtsp: 'screens.cameras.driver-rtsp',
} as const satisfies Record<CameraDriverKind, TranslationKey>;

const NOTE_LABEL: Readonly<Record<string, TranslationKey>> = {
  'tapo-camera-account': 'screens.cameras.catalog.note-tapo-account',
  'tapo-doorbell-wired': 'screens.cameras.catalog.note-doorbell-wired',
  'safety-code-password': 'screens.cameras.catalog.note-safety-code',
  'verification-code-password': 'screens.cameras.catalog.note-verification-code',
  'reolink-h265': 'screens.cameras.catalog.note-reolink',
  'custom-paths': 'screens.cameras.catalog.note-custom-paths',
};

function ModelRow({ model, driver, onChange }: ModelRowProps) {
  const { t } = useTranslation();
  const note = model ? NOTE_LABEL[model.note] : undefined;
  return (
    <Stack gap={2}>
      <Row
        leading={
          <CameraIllustration
            formFactor={model?.formFactor ?? (driver === 'tapo' ? 'pan-tilt' : 'bullet')}
            size={56}
          />
        }
        title={model ? catalogLabel(model) : t(DRIVER_LABEL[driver])}
        meta={
          model
            ? t(FORM_FACTOR_LABEL[model.formFactor])
            : t('screens.cameras.catalog.unknown-model')
        }
        trailing={
          <Button
            compact
            variant="ghost"
            label={t('screens.cameras.catalog.change')}
            onPress={onChange}
          />
        }
      />
      {note ? <Text variant="meta">{t(note)}</Text> : null}
    </Stack>
  );
}

function Retype({ setup, cloud }: RetypeProps) {
  const { t } = useTranslation();
  const { form } = setup;
  const toggle = (name: 'noPassword' | 'noCloudPassword', secret: 'password' | 'cloudPassword') => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Row
          title={t(
            name === 'noPassword'
              ? 'screens.cameras.no-password'
              : 'screens.cameras.no-cloud-password'
          )}
          meta={t(
            name === 'noPassword'
              ? 'screens.cameras.no-password-hint'
              : 'screens.cameras.no-cloud-password-hint'
          )}
          trailing={
            <Switch
              value={field.value}
              label={t(
                name === 'noPassword'
                  ? 'screens.cameras.no-password'
                  : 'screens.cameras.no-cloud-password'
              )}
              onValueChange={(next) => {
                field.onChange(next);
                if (next) form.setValue(secret, '');
                void form.trigger(secret);
              }}
            />
          }
        />
      )}
    />
  );
  return (
    <Stack gap={2}>
      <Notice inline tone="attention" icon="key" title={t('screens.cameras.address-changed')} />
      {toggle('noPassword', 'password')}
      {cloud ? toggle('noCloudPassword', 'cloudPassword') : null}
    </Stack>
  );
}

function CustomPaths({ setup }: ConnectionStepProps) {
  const { t } = useTranslation();
  const { control } = setup.form;
  return (
    <>
      <SetupField
        control={control}
        name="streamPath"
        label={t('screens.cameras.stream-path')}
        placeholder={STREAM_PATH_EXAMPLE}
        content="url"
      />
      <SetupField
        control={control}
        name="subStreamPath"
        label={t('screens.cameras.sub-stream-path')}
        placeholder={SUB_STREAM_PATH_EXAMPLE}
        hint={t('screens.cameras.stream-path-hint')}
        content="url"
      />
    </>
  );
}

export function ConnectionStep({ setup }: ConnectionStepProps) {
  const { t } = useTranslation();
  const { form, isEdit, selectedModel } = setup;
  const values = useWatch({ control: form.control });
  const driver = values.driver ?? 'tapo';
  const spec = CAMERA_DRIVER_SPECS[driver];
  const retype = credentialsToRetype({
    isEdit,
    ip: values.ip ?? '',
    port: values.port ?? '',
    storedIp: values.storedIp ?? '',
    storedPort: values.storedPort ?? '',
    driver,
  });
  const keep =
    isEdit && !retype.password ? t('screens.cameras.connection.keep-password') : undefined;
  return (
    <Stack gap={4}>
      <ModelRow model={selectedModel} driver={driver} onChange={setup.openModels} />
      <Inline gap={3} fill>
        <SetupField
          control={form.control}
          name="ip"
          label={t('screens.cameras.ip-label')}
          placeholder="192.168.1.50"
          content="url"
        />
        <SetupField
          control={form.control}
          name="port"
          label={t('screens.cameras.form.port')}
          content="number"
        />
      </Inline>
      <SetupField
        control={form.control}
        name="username"
        label={t('screens.cameras.user-label')}
        content="url"
      />
      {retype.password && values.noPassword ? null : (
        <SetupField
          control={form.control}
          name="password"
          label={t('screens.cameras.password-label')}
          hint={keep}
          secret
        />
      )}
      {retype.addressChanged ? <Retype setup={setup} cloud={retype.cloudPassword} /> : null}
      {spec.requiresCloud ? (
        <>
          <SetupField
            control={form.control}
            name="cloudUsername"
            label={t('screens.cameras.cloud-user')}
            content="email"
          />
          {retype.cloudPassword && values.noCloudPassword ? null : (
            <SetupField
              control={form.control}
              name="cloudPassword"
              label={t('screens.cameras.cloud-password')}
              hint={t('screens.cameras.cloud-hint')}
              secret
            />
          )}
        </>
      ) : null}
      {spec.customPaths ? <CustomPaths setup={setup} /> : null}
      <Text variant="meta">{t('screens.cameras.form.password-hint')}</Text>
    </Stack>
  );
}
