import type { ICameraCapabilities, ICameraDeviceStatus } from '@/core/interfaces';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { CameraDeviceSettings } from '@/features/cameras/components/camera-device-settings';
import type { CameraDeviceSettingsControls } from '@/features/cameras/hooks/use-camera-device-settings';

type CameraControlPanelProps = {
  features: ICameraCapabilities;
  device: ICameraDeviceStatus | null;
  controls: CameraDeviceSettingsControls;
  deviceFailed: boolean;
  className?: string;
};

export function CameraControlPanel({ features, device, controls, deviceFailed, className }: CameraControlPanelProps) {
  const { t } = useTranslation();
  const subtitle = device?.model
    ? [device.model, device.firmware].filter(Boolean).join(' · ')
    : deviceFailed
      ? t('screens.cameras.device-offline')
      : t('screens.cameras.device-reading');

  return (
    <Panel title={t('screens.cameras.settings')} description={subtitle} className={className}>
      <CameraDeviceSettings features={features} status={device} controls={controls} />
      {features.ptz ? <Text variant="micro">{t('screens.cameras.ptz-on-video')}</Text> : null}
    </Panel>
  );
}
