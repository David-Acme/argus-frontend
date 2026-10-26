import { useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Icon } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Sheet } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';

export type GazeSectionProps = { settings: CameraSettings };

export function GazeSection({ settings }: GazeSectionProps) {
  const { t } = useTranslation();
  const [choosing, setChoosing] = useState(false);
  const { aim, presets, access } = settings;
  const home = aim.homePreset;
  const homeName = presets.presets.find((preset) => preset.id === home)?.name || home;
  const choosable = access.managePresets && presets.presets.length > 0;
  return (
    <>
      <Section title={t('screens.cameras.sight.title')}>
        <Row
          leading={<Avatar icon="home" />}
          title={t('screens.cameras.sight.home')}
          meta={
            homeName ??
            (choosable
              ? t('screens.cameras.sight.home-none')
              : t('screens.cameras.sight.home-needs-preset'))
          }
          chevron={choosable}
          onPress={choosable ? () => setChoosing(true) : undefined}
        />
        <Row
          title={t('screens.cameras.sight.active-look')}
          meta={
            home
              ? t('screens.cameras.sight.active-look-hint')
              : t('screens.cameras.sight.active-look-needs-home')
          }
          trailing={
            home ? (
              <Switch
                value={aim.settings.activeLook}
                label={t('screens.cameras.sight.active-look')}
                onValueChange={(activeLook) => void aim.update({ activeLook })}
              />
            ) : undefined
          }
        />
        {home ? (
          <Row
            title={t('screens.cameras.sight.follow')}
            meta={t('screens.cameras.sight.follow-hint')}
            trailing={
              <Switch
                value={aim.settings.followIntruders}
                label={t('screens.cameras.sight.follow')}
                onValueChange={(followIntruders) => void aim.update({ followIntruders })}
              />
            }
          />
        ) : null}
      </Section>
      <Sheet
        open={choosing}
        onClose={() => setChoosing(false)}
        title={t('screens.cameras.sight.home')}
        variant="list">
        {presets.presets.map((preset) => (
          <Row
            key={preset.id}
            title={preset.name || t('screens.cameras.patrol.unnamed-stop')}
            trailing={
              preset.id === home ? <Icon name="check" size="small" tone="accent" /> : undefined
            }
            onPress={() => {
              setChoosing(false);
              if (preset.id !== home) void presets.setHome(preset);
            }}
          />
        ))}
      </Sheet>
    </>
  );
}
