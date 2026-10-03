import { View } from 'react-native';
import type { ICameraCapabilities, ICameraDeviceStatus } from '@/core/interfaces';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PtzPad } from '@/features/cameras/components/ptz-pad';

type CameraControlPanelProps = {
  features: ICameraCapabilities;
  device: ICameraDeviceStatus | null;
  moving: boolean;
  onStep: (angle: number) => void;
  onCenter: () => void;
  onTalk: () => void;
  onSettings: () => void;
  className?: string;
};

export function CameraControlPanel({
  features,
  device,
  moving,
  onStep,
  onCenter,
  onTalk,
  onSettings,
  className,
}: CameraControlPanelProps) {
  const { t } = useTranslation();
  const subtitle = device?.model
    ? [device.model, device.firmware].filter(Boolean).join(' · ')
    : t('screens.cameras.device-offline');

  return (
    <Panel
      title={t('screens.cameras.ptz')}
      description={subtitle}
      className={className}
      action={
        <View className="flex-row gap-2">
          {features.talk ? (
            <Button variant="outline" size="sm" accessibilityLabel={t('screens.cameras.talk')} onPress={onTalk}>
              <Icon name="mic" className="text-foreground size-4" />
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onPress={onSettings}>
            <Icon name="sliders" className="text-foreground size-4" />
            <Text>{t('screens.cameras.settings')}</Text>
          </Button>
        </View>
      }>
      {features.ptz ? (
        <View className="flex-1 items-center justify-center py-2">
          <PtzPad
            labels={{
              up: t('screens.cameras.ptz-up'),
              down: t('screens.cameras.ptz-down'),
              left: t('screens.cameras.ptz-left'),
              right: t('screens.cameras.ptz-right'),
              center: t('screens.cameras.ptz-center'),
            }}
            disabled={moving}
            onStep={onStep}
            onCenter={onCenter}
          />
        </View>
      ) : null}
    </Panel>
  );
}
