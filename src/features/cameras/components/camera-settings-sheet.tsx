import { View } from 'react-native';
import {
  MOTION_SENSITIVITY,
  sensitivityLevel,
  type MotionSensitivityLevel,
} from '@/features/cameras/model/camera-presets';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import type { ICameraCapabilities, ICameraDeviceStatus, ICameraSettings } from '@/core/interfaces';
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
  features: ICameraCapabilities | null;
  onApplied: (status: ICameraDeviceStatus | null) => void;
};

function optimisticStatus(status: ICameraDeviceStatus | null, body: ICameraSettings): ICameraDeviceStatus {
  return {
    ...status,
    privacyEnabled: body.privacy ?? status?.privacyEnabled,
    ledEnabled: body.led ?? status?.ledEnabled,
    motionEnabled: body.motion ?? status?.motionEnabled,
    autoTrackEnabled: body.autoTrack ?? status?.autoTrackEnabled,
    dayNightMode: body.dayNight ?? status?.dayNightMode,
    motionSensitivity: body.motionSensitivity ?? status?.motionSensitivity,
  };
}

export function CameraSettingsSheet({
  open,
  onOpenChange,
  cameraId,
  status,
  features,
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
  const sensitivityOptions: MenuOption<MotionSensitivityLevel>[] = [
    { value: 'low', label: t('screens.cameras.sensitivity-low') },
    { value: 'normal', label: t('screens.cameras.sensitivity-normal') },
    { value: 'high', label: t('screens.cameras.sensitivity-high') },
  ];
  const sensitivity = sensitivityLevel(status?.motionSensitivity);

  const apply = async (body: ICameraSettings) => {
    const previous = status;
    onApplied(optimisticStatus(previous, body));
    const result = await run({
      call: () => cameraControlService.settings(cameraId, body),
      errorTitle: t('screens.cameras.device-offline'),
    });
    onApplied(result ? (result.info ?? optimisticStatus(previous, body)) : previous);
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
        {features?.privacy !== false ? (
          <ToggleRow
            label={t('screens.cameras.privacy')}
            value={status?.privacyEnabled ?? false}
            disabled={busy}
            onChange={(privacy) => void apply({ privacy })}
          />
        ) : null}
        {features?.led !== false ? (
          <ToggleRow
            label={t('screens.cameras.led')}
            value={status?.ledEnabled ?? false}
            disabled={busy}
            onChange={(led) => void apply({ led })}
          />
        ) : null}
        {features?.motion !== false ? (
          <ToggleRow
            label={t('screens.cameras.motion')}
            value={status?.motionEnabled ?? false}
            disabled={busy}
            onChange={(motion) => void apply({ motion })}
          />
        ) : null}
        {features?.motion !== false && status?.motionEnabled !== false ? (
          <View className="flex-row items-center justify-between py-2.5">
            <Text variant="body">{t('screens.cameras.sensitivity')}</Text>
            <AdaptiveSelect
              options={sensitivityOptions}
              value={sensitivity}
              onChange={(level) => void apply({ motion: true, motionSensitivity: MOTION_SENSITIVITY[level] })}
              title={t('screens.cameras.sensitivity')}
              closeLabel={t('common.close')}
              searchPlaceholder={t('screens.home.search-placeholder')}
              emptyLabel={t('screens.cameras.zones-empty')}
              trigger={
                <Button variant="outline" size="sm" disabled={busy}>
                  <Text>{sensitivityOptions.find((option) => option.value === sensitivity)?.label}</Text>
                </Button>
              }
            />
          </View>
        ) : null}
        {features?.autoTrack !== false ? (
          <ToggleRow
            label={t('screens.cameras.auto-track')}
            value={status?.autoTrackEnabled ?? false}
            disabled={busy}
            onChange={(autoTrack) => void apply({ autoTrack })}
          />
        ) : null}

        {features?.dayNight !== false ? (
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
        ) : null}
      </View>
    </AdaptiveDialog>
  );
}
