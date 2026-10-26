import { useTranslation } from '@/shared/hooks/use-translation';
import { privacyStateOf } from '@/shared/libs/camera-privacy';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import { privacyApplyConfirm } from '@/features/cameras/model/camera-device';

export type PrivacySectionProps = { settings: CameraSettings };

export function PrivacySection({ settings }: PrivacySectionProps) {
  const { t } = useTranslation();
  const { device, deviceSettings, recheck } = settings;
  const state = privacyStateOf(device?.privacyEnabled);
  const label = t('screens.cameras.privacy');
  const change = (privacy: boolean) =>
    void deviceSettings.apply(
      { privacy },
      {
        confirm: privacyApplyConfirm(privacy, {
          title: label,
          description: t('screens.cameras.privacy-confirm'),
        }),
      }
    );
  return (
    <Section title={t('screens.cameras.sections.privacy')}>
      <Row
        leading={<Avatar icon="lock" />}
        title={label}
        meta={
          state === 'unknown'
            ? t('screens.cameras.privacy-unknown-hint')
            : t('screens.cameras.privacy-hint')
        }
        trailing={
          state === 'unknown' ? (
            <Button
              compact
              variant="ghost"
              label={t('screens.cameras.privacy-recheck')}
              onPress={recheck}
            />
          ) : (
            <Switch
              value={state === 'on'}
              label={label}
              disabled={deviceSettings.busy}
              onValueChange={change}
            />
          )
        }
      />
    </Section>
  );
}
