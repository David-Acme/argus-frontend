import { useTranslation } from '@/shared/hooks/use-translation';
import type { ChoiceOption } from '@/shared/ui/choice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import { MOTION_SENSITIVITY, sensitivityLevel } from '@/features/cameras/model/camera-presets';
import type { MotionSensitivityLevel } from '@/features/cameras/model/camera-presets';
import { ChoiceRow } from '@/features/cameras/components/settings/choice-row';

export type DetectionSectionProps = { settings: CameraSettings };

export function DetectionSection({ settings }: DetectionSectionProps) {
  const { t } = useTranslation();
  const { features, device, deviceSettings } = settings;
  const { apply, busy } = deviceSettings;
  const unknown = device === null;
  const levels: ChoiceOption<MotionSensitivityLevel>[] = [
    { value: 'low', label: t('screens.cameras.sensitivity-low') },
    { value: 'normal', label: t('screens.cameras.sensitivity-normal') },
    { value: 'high', label: t('screens.cameras.sensitivity-high') },
  ];
  return (
    <Section title={t('screens.cameras.sections.detection')}>
      {features?.motion ? (
        <Row
          title={t('screens.cameras.motion')}
          meta={t('screens.cameras.motion-hint')}
          trailing={
            <Switch
              value={device?.motionEnabled ?? false}
              label={t('screens.cameras.motion')}
              disabled={busy || unknown}
              onValueChange={(motion) => void apply({ motion })}
            />
          }
        />
      ) : null}
      {features?.motion && device?.motionEnabled ? (
        <ChoiceRow
          label={t('screens.cameras.sensitivity')}
          options={levels}
          value={sensitivityLevel(device.motionSensitivity)}
          onChange={(level) =>
            void apply({ motion: true, motionSensitivity: MOTION_SENSITIVITY[level] })
          }
        />
      ) : null}
      {features?.autoTrack ? (
        <Row
          title={t('screens.cameras.auto-track')}
          meta={t('screens.cameras.auto-track-hint')}
          trailing={
            <Switch
              value={device?.autoTrackEnabled ?? false}
              label={t('screens.cameras.auto-track')}
              disabled={busy || unknown}
              onValueChange={(autoTrack) => void apply({ autoTrack })}
            />
          }
        />
      ) : null}
    </Section>
  );
}
