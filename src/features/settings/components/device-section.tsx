import { useRouter } from 'expo-router';
import { IS_TAURI } from '@/shared/constants';
import { useDevicePreferences } from '@/shared/hooks/use-device-preferences';
import { useTranslation } from '@/shared/hooks/use-translation';
import { serviceErrorKey } from '@/shared/libs/service-error';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { useAppearanceLine } from '@/features/profile';
import { APPEARANCE_HREF } from '@/features/settings/constants/services.constant';
import { useDesktopAutostart } from '@/features/settings/hooks/use-desktop-autostart';
import { showsDesktopAutostart } from '@/features/settings/model/desktop-autostart';

function AutostartRow() {
  const { t } = useTranslation();
  const { enabled, status, error, change } = useDesktopAutostart();
  return (
    <Row
      leading={<Avatar icon="devices" />}
      title={t('screens.settings.desktop.autostart.label')}
      meta={
        error
          ? `${t('screens.settings.desktop.autostart.failed')} ${t(serviceErrorKey(error))}`
          : t('screens.settings.desktop.autostart.hint')
      }
      metaTone={error ? 'alert' : undefined}
      trailing={
        <Switch
          label={t('screens.settings.desktop.autostart.label')}
          value={enabled}
          disabled={status !== 'idle'}
          onValueChange={change}
        />
      }
    />
  );
}

export function DeviceSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const { haptics, setHaptics } = useDevicePreferences();
  const appearance = useAppearanceLine();
  return (
    <Section title={t('screens.settings.device.title')}>
      <Row
        leading={<Avatar icon="sun" />}
        title={t('screens.profile.links.appearance.title')}
        meta={appearance}
        chevron
        onPress={() => router.push(APPEARANCE_HREF)}
      />
      <Row
        leading={<Avatar icon="check" />}
        title={t('screens.settings.device.haptics')}
        meta={t('screens.settings.device.haptics-meta')}
        trailing={
          <Switch
            label={t('screens.settings.device.haptics')}
            value={haptics}
            onValueChange={setHaptics}
          />
        }
      />
      {showsDesktopAutostart({ isTauri: IS_TAURI }) ? <AutostartRow /> : null}
    </Section>
  );
}
