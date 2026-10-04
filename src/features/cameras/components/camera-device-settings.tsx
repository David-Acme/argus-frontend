import { View } from 'react-native';
import type { ICameraCapabilities, ICameraDeviceStatus } from '@/core/interfaces';
import type { DayNightMode } from '@/core/types';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { CameraDeviceSettingsControls } from '@/features/cameras/hooks/use-camera-device-settings';
import {
  MOTION_SENSITIVITY,
  sensitivityLevel,
  type MotionSensitivityLevel,
} from '@/features/cameras/model/camera-presets';

type CameraDeviceSettingsProps = {
  features: ICameraCapabilities;
  status: ICameraDeviceStatus | null;
  controls: CameraDeviceSettingsControls;
};

type ChoiceRowProps<TValue extends string> = {
  label: string;
  value: TValue;
  options: readonly { value: TValue; label: string }[];
  onChange: (value: TValue) => void;
};

function ChoiceRow<TValue extends string>({ label, value, options, onChange }: ChoiceRowProps<TValue>) {
  return (
    <View className="gap-2 py-1.5">
      <Text variant="body">{label}</Text>
      <SegmentedControl accessibilityLabel={label} value={value} onChange={onChange} options={options} />
    </View>
  );
}

export function CameraDeviceSettings({ features, status, controls }: CameraDeviceSettingsProps) {
  const { t } = useTranslation();
  const { apply, busy } = controls;
  const dayNight = (status?.dayNightMode as DayNightMode | undefined) ?? 'auto';
  const sensitivity = sensitivityLevel(status?.motionSensitivity);
  const unknown = status == null;

  return (
    <View className="gap-0.5">
      {features.privacy ? (
        <ToggleRow
          label={t('screens.cameras.privacy')}
          hint={t('screens.cameras.privacy-hint')}
          value={status?.privacyEnabled ?? false}
          disabled={busy || unknown}
          onChange={(privacy) => void apply({ privacy })}
        />
      ) : null}
      {features.motion ? (
        <ToggleRow
          label={t('screens.cameras.motion')}
          hint={t('screens.cameras.motion-hint')}
          value={status?.motionEnabled ?? false}
          disabled={busy || unknown}
          onChange={(motion) => void apply({ motion })}
        />
      ) : null}
      {features.motion && status?.motionEnabled ? (
        <ChoiceRow<MotionSensitivityLevel>
          label={t('screens.cameras.sensitivity')}
          value={sensitivity}
          onChange={(level) => void apply({ motion: true, motionSensitivity: MOTION_SENSITIVITY[level] })}
          options={[
            { value: 'low', label: t('screens.cameras.sensitivity-low') },
            { value: 'normal', label: t('screens.cameras.sensitivity-normal') },
            { value: 'high', label: t('screens.cameras.sensitivity-high') },
          ]}
        />
      ) : null}
      {features.autoTrack ? (
        <ToggleRow
          label={t('screens.cameras.auto-track')}
          hint={t('screens.cameras.auto-track-hint')}
          value={status?.autoTrackEnabled ?? false}
          disabled={busy || unknown}
          onChange={(autoTrack) => void apply({ autoTrack })}
        />
      ) : null}
      {features.led ? (
        <ToggleRow
          label={t('screens.cameras.led')}
          value={status?.ledEnabled ?? false}
          disabled={busy || unknown}
          onChange={(led) => void apply({ led })}
        />
      ) : null}
      {features.dayNight ? (
        <ChoiceRow<DayNightMode>
          label={t('screens.cameras.day-night')}
          value={dayNight}
          onChange={(mode) => void apply({ dayNight: mode })}
          options={[
            { value: 'auto', label: t('screens.cameras.day-night-auto') },
            { value: 'day', label: t('screens.cameras.day-night-day') },
            { value: 'night', label: t('screens.cameras.day-night-night') },
          ]}
        />
      ) : null}
    </View>
  );
}
