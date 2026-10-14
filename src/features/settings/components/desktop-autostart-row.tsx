import { View } from 'react-native';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { serviceErrorKey } from '@/shared/libs/service-error';
import { useDesktopAutostart } from '@/features/settings/hooks/use-desktop-autostart';

export function DesktopAutostartRow() {
  const { t } = useTranslation();
  const { enabled, status, error, change } = useDesktopAutostart();

  return (
    <Panel className="gap-2 p-4">
      <ToggleRow
        label={t('screens.settings.desktop.autostart.label')}
        hint={t('screens.settings.desktop.autostart.hint')}
        value={enabled}
        disabled={status !== 'idle'}
        onChange={change}
      />
      {error ? (
        <View className="gap-0.5">
          <Text variant="caption" className="text-error-strong">
            {t('screens.settings.desktop.autostart.failed')}
          </Text>
          <Text variant="micro">{t(serviceErrorKey(error))}</Text>
        </View>
      ) : null}
    </Panel>
  );
}
