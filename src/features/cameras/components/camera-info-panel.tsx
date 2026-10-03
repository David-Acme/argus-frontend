import { View } from 'react-native';
import type { ICameraCacheRow, ICameraDeviceStatus } from '@/core/interfaces';
import type { CameraDriverKind, TranslationKey } from '@/core/types';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraStatusOf, type CameraCardStatus } from '@/features/cameras/components/camera-card';

type CameraInfoPanelProps = {
  camera: ICameraCacheRow;
  device: ICameraDeviceStatus | null;
  streamOnly: boolean;
  className?: string;
};

type InfoRowProps = {
  label: string;
  value: string;
};

const DRIVER_LABEL = {
  tapo: 'screens.cameras.driver-tapo',
  onvif: 'screens.cameras.driver-onvif',
  rtsp: 'screens.cameras.driver-rtsp',
} as const satisfies Record<CameraDriverKind, TranslationKey>;

const STATUS_LABEL = {
  online: 'screens.cameras.status.online',
  offline: 'screens.cameras.status.offline',
  disabled: 'screens.cameras.status.disabled',
} as const satisfies Record<CameraCardStatus, TranslationKey>;

const STATUS_DOT: Record<CameraCardStatus, string> = {
  online: 'bg-success',
  offline: 'bg-error',
  disabled: 'bg-muted-foreground',
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View className="min-h-9 flex-row items-center justify-between gap-3">
      <Text variant="caption">{label}</Text>
      <Text variant="label" className="min-w-0 shrink text-right" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function CameraInfoPanel({ camera, device, streamOnly, className }: CameraInfoPanelProps) {
  const { t } = useTranslation();
  const status = cameraStatusOf(camera);
  const model = device?.model || camera.modelLabel;

  return (
    <Panel title={t('screens.cameras.info.title')} className={className}>
      <View className="min-h-9 flex-row items-center justify-between gap-3">
        <Text variant="caption">{t('screens.cameras.info.status')}</Text>
        <StatusBadge label={t(STATUS_LABEL[status])} dotClassName={STATUS_DOT[status]} />
      </View>
      <InfoRow label={t('screens.cameras.info.address')} value={`${camera.ip}:${camera.port}`} />
      <InfoRow label={t('screens.cameras.info.driver')} value={t(DRIVER_LABEL[camera.driver])} />
      {model ? <InfoRow label={t('screens.cameras.info.model')} value={model} /> : null}
      {device?.firmware ? <InfoRow label={t('screens.cameras.info.firmware')} value={device.firmware} /> : null}
      <InfoRow
        label={t('screens.cameras.record-mode')}
        value={
          camera.recordMode === 'continuous'
            ? t('screens.cameras.form.record-continuous')
            : t('screens.cameras.form.record-events')
        }
      />
      {camera.retentionDays != null ? (
        <InfoRow label={t('screens.cameras.form.retention')} value={String(camera.retentionDays)} />
      ) : null}
      {streamOnly ? (
        <Text variant="caption" className="bg-surface-secondary rounded-2xl px-3 py-2.5">
          {t('screens.cameras.info.stream-only')}
        </Text>
      ) : null}
    </Panel>
  );
}
