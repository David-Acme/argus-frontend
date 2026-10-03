import { useState } from 'react';
import { View } from 'react-native';
import { cameraControlService } from '@/core/services/camera-control.service';
import type { ICameraDeviceStatus, ICameraSettings } from '@/core/interfaces';
import type { DayNightMode, MenuOption } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { SettingRow } from './setting-row';
import { toastServiceError } from '@/shared/libs/service-error';

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
  const [busy, setBusy] = useState(false);

  const dayNightOptions: MenuOption<DayNightMode>[] = [
    { value: 'auto', label: t('screens.cameras.day-night-auto') },
    { value: 'day', label: t('screens.cameras.day-night-day') },
    { value: 'night', label: t('screens.cameras.day-night-night') },
  ];
  const dayNight = (status?.dayNightMode as DayNightMode) ?? 'auto';

  const apply = async (body: ICameraSettings) => {
    setBusy(true);
    const result = await cameraControlService.settings(cameraId, body);
    setBusy(false);
    if (!result.ok) {
      toastServiceError(result.errors, t('screens.cameras.device-offline'));
      return;
    }
    onApplied(result.info ?? null);
    toast.success(t('screens.cameras.settings-saved'));
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
        <SettingRow
          label={t('screens.cameras.privacy')}
          value={status?.privacyEnabled ?? false}
          disabled={busy}
          onChange={(privacy) => void apply({ privacy })}
        />
        <SettingRow
          label={t('screens.cameras.led')}
          value={status?.ledEnabled ?? false}
          disabled={busy}
          onChange={(led) => void apply({ led })}
        />
        <SettingRow
          label={t('screens.cameras.motion')}
          value={status?.motionEnabled ?? false}
          disabled={busy}
          onChange={(motion) => void apply({ motion })}
        />
        <SettingRow
          label={t('screens.cameras.auto-track')}
          value={status?.autoTrackEnabled ?? false}
          disabled={busy}
          onChange={(autoTrack) => void apply({ autoTrack })}
        />

        <View className="flex-row items-center justify-between py-2.5">
          <Text className="text-sm">{t('screens.cameras.day-night')}</Text>
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
