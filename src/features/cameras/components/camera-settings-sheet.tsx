import { View } from 'react-native';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import type { ICameraDeviceStatus, ICameraSettings } from '@/core/interfaces';
import type { DayNightMode, MenuOption } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useServiceAction } from '@/shared/hooks/use-service-action';

type CameraSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId: string;
  status: ICameraDeviceStatus | null;
  onApplied: (status: ICameraDeviceStatus | null) => void;
};

export function CameraSettingsSheet({
  open,
  onOpenChange,
  cameraId,
  status,
  onApplied,
}: CameraSettingsSheetProps) {
  const { t } = useTranslation();
  const { run, pending: busy } = useServiceAction();

  const dayNightOptions: MenuOption<DayNightMode>[] = [
    { value: 'auto', label: t('screens.cameras.day-night-auto') },
    { value: 'day', label: t('screens.cameras.day-night-day') },
    { value: 'night', label: t('screens.cameras.day-night-night') },
  ];
  const dayNight = (status?.dayNightMode as DayNightMode) ?? 'auto';

  const apply = async (body: ICameraSettings) => {
    const result = await run({
      call: () => cameraControlService.settings(cameraId, body),
      success: t('screens.cameras.settings-saved'),
      errorTitle: t('screens.cameras.device-offline'),
    });
    if (result) onApplied(result.info ?? null);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.cameras.settings')}
      closeLabel={t('common.close')}
      footer={
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          <Text>{t('common.close')}</Text>
        </Button>
      }>
      <View className="gap-1 pb-1">
        <ToggleRow
          label={t('screens.cameras.privacy')}
          value={status?.privacyEnabled ?? false}
          disabled={busy}
          onChange={(privacy) => void apply({ privacy })}
        />
        <ToggleRow
          label={t('screens.cameras.led')}
          value={status?.ledEnabled ?? false}
          disabled={busy}
          onChange={(led) => void apply({ led })}
        />
        <ToggleRow
          label={t('screens.cameras.motion')}
          value={status?.motionEnabled ?? false}
          disabled={busy}
          onChange={(motion) => void apply({ motion })}
        />
        <ToggleRow
          label={t('screens.cameras.auto-track')}
          value={status?.autoTrackEnabled ?? false}
          disabled={busy}
          onChange={(autoTrack) => void apply({ autoTrack })}
        />

        <View className="flex-row items-center justify-between py-2.5">
          <Text variant="body">{t('screens.cameras.day-night')}</Text>
          <AdaptiveSelect
            options={dayNightOptions}
            value={dayNight}
            onChange={(mode) => void apply({ dayNight: mode })}
            title={t('screens.cameras.day-night')}
            closeLabel={t('common.close')}
            searchPlaceholder={t('screens.home.search-placeholder')}
            emptyLabel={t('screens.cameras.zones-empty')}
            trigger={
              <Button variant="outline" size="sm">
                <Text>{dayNightOptions.find((option) => option.value === dayNight)?.label}</Text>
              </Button>
            }
          />
        </View>
      </View>
    </AdaptiveDialog>
  );
}
