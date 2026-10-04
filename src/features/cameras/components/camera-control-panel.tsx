import { View } from 'react-native';
import type { ICameraCapabilities, ICameraDeviceStatus } from '@/core/interfaces';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PtzPad } from '@/features/cameras/components/ptz-pad';
import type { CameraPreset } from '@/features/cameras/model/camera-presets';

type CameraControlPanelProps = {
  features: ICameraCapabilities;
  device: ICameraDeviceStatus | null;
  moving: boolean;
  onStep: (angle: number) => void;
  onCenter: () => void;
  onSettings: () => void;
  presets: readonly CameraPreset[];
  onGotoPreset: (preset: CameraPreset) => void;
  onSavePreset: () => void;
  className?: string;
};

export function CameraControlPanel({
  features,
  device,
  moving,
  onStep,
  onCenter,
  onSettings,
  presets,
  onGotoPreset,
  onSavePreset,
  className,
}: CameraControlPanelProps) {
  const { t } = useTranslation();
  const subtitle = device?.model
    ? [device.model, device.firmware].filter(Boolean).join(' · ')
    : t('screens.cameras.device-offline');

  return (
    <Panel
      title={features.ptz ? t('screens.cameras.ptz') : t('screens.cameras.device-controls')}
      description={subtitle}
      className={className}
      action={
        <View className="flex-row gap-2">
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
      {features.presets ? (
        <View className="gap-2">
          <Text variant="micro">{t('screens.cameras.presets')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {presets.map((preset) => (
              <Button key={preset.id} variant="outline" size="sm" disabled={moving} onPress={() => onGotoPreset(preset)}>
                <Text numberOfLines={1}>{preset.name || preset.id}</Text>
              </Button>
            ))}
            <Button variant="ghost" size="sm" disabled={moving} onPress={onSavePreset}>
              <Icon name="plus" className="text-foreground size-4" />
              <Text>{t('screens.cameras.preset-save')}</Text>
            </Button>
          </View>
          {presets.length === 0 ? <Text variant="caption">{t('screens.cameras.preset-empty')}</Text> : null}
        </View>
      ) : null}
    </Panel>
  );
}
