import { useRouter } from 'expo-router';
import type { CameraDriverKind, DayNightMode, TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { ChoiceOption } from '@/shared/ui/choice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { useCameraEnvironmentIndex } from '@/features/security';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import { cameraAddressLabel } from '@/features/cameras/model/camera-address';
import { cameraStatusOf } from '@/features/cameras/model/camera-overview';
import { recordModeLabelKey } from '@/features/cameras/model/camera-record-mode';
import { STATUS_LABEL } from '@/features/cameras/model/camera-status';
import { ChoiceRow } from '@/features/cameras/components/settings/choice-row';

export type DeviceSectionProps = { settings: CameraSettings };

const DRIVER_LABEL = {
  tapo: 'screens.cameras.driver-tapo',
  onvif: 'screens.cameras.driver-onvif',
  rtsp: 'screens.cameras.driver-rtsp',
} as const satisfies Record<CameraDriverKind, TranslationKey>;

function useSdCard(settings: CameraSettings): string | null {
  const { t } = useTranslation();
  const card = settings.device?.sdCard;
  if (!card) return null;
  if (card.status === 'normal')
    return t('screens.cameras.info.sd-free', { free: card.free, total: card.total });
  if (card.status === 'offline') return t('screens.cameras.info.sd-none');
  return t('screens.cameras.info.sd-unknown');
}

function useRetention(settings: CameraSettings): string | null {
  const { t } = useTranslation();
  const { camera } = settings;
  if (camera.retentionDays == null) return null;
  const days = String(camera.retentionDays);
  return camera.retentionIncident
    ? t('screens.cameras.retention.value-incident', { days })
    : t('screens.cameras.retention.value', { days });
}

function DeviceControls({ settings }: DeviceSectionProps) {
  const { t } = useTranslation();
  const { features, device, deviceSettings, access } = settings;
  if (!access.update) return null;
  const nights: ChoiceOption<DayNightMode>[] = [
    { value: 'auto', label: t('screens.cameras.day-night-auto') },
    { value: 'day', label: t('screens.cameras.day-night-day') },
    { value: 'night', label: t('screens.cameras.day-night-night') },
  ];
  const mode = nights.find((night) => night.value === device?.dayNightMode)?.value ?? 'auto';
  return (
    <>
      {features?.led ? (
        <Row
          title={t('screens.cameras.led')}
          trailing={
            <Switch
              value={device?.ledEnabled ?? false}
              label={t('screens.cameras.led')}
              disabled={deviceSettings.busy || device === null}
              onValueChange={(led) => void deviceSettings.apply({ led })}
            />
          }
        />
      ) : null}
      {features?.dayNight ? (
        <ChoiceRow
          label={t('screens.cameras.day-night')}
          options={nights}
          value={mode}
          onChange={(dayNight) => void deviceSettings.apply({ dayNight })}
        />
      ) : null}
    </>
  );
}

export function DeviceSection({ settings }: DeviceSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { camera, device, features } = settings;
  const place = useCameraEnvironmentIndex().get(camera.id);
  const address = cameraAddressLabel(camera);
  const model = device?.model || camera.modelLabel;
  const sd = useSdCard(settings);
  const retention = useRetention(settings);
  return (
    <Section title={t('screens.cameras.info.title')}>
      {place ? (
        <Row
          title={t('screens.cameras.info.place')}
          trailing={place.name}
          chevron
          onPress={() => router.push(`/security/${place.environmentId}`)}
        />
      ) : null}
      <Row
        title={t('screens.cameras.info.status')}
        trailing={t(STATUS_LABEL[cameraStatusOf(camera)])}
      />
      {model ? <Row title={t('screens.cameras.info.model')} trailing={model} /> : null}
      {device?.firmware ? (
        <Row title={t('screens.cameras.info.firmware')} trailing={device.firmware} />
      ) : null}
      {address ? <Row title={t('screens.cameras.info.address')} trailing={address} /> : null}
      <Row title={t('screens.cameras.info.driver')} trailing={t(DRIVER_LABEL[camera.driver])} />
      <Row
        title={t('screens.cameras.record-mode')}
        trailing={t(recordModeLabelKey(camera.recordMode))}
      />
      {retention ? <Row title={t('screens.cameras.form.retention')} trailing={retention} /> : null}
      {sd ? <Row title={t('screens.cameras.info.sd-card')} trailing={sd} /> : null}
      <DeviceControls settings={settings} />
      {features?.streamOnly ? <Row title={t('screens.cameras.info.stream-only')} /> : null}
    </Section>
  );
}
