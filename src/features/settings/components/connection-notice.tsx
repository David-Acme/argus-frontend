import { View } from 'react-native';
import type { SettingsOwner } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ownerStatus } from '@/features/settings/model/settings-catalog';
import { ownerName, spokenList } from '@/features/settings/model/setting-text';

type ConnectionNoticeProps = {
  owners: readonly SettingsOwner[];
  onRetry: () => void;
  onDetails: () => void;
};

export function ConnectionNotice({ owners, onRetry, onDetails }: ConnectionNoticeProps) {
  const { t } = useTranslation();
  const unconfigured = owners.filter((owner) => ownerStatus(owner) === 'unconfigured').map(ownerName);
  const unreachable = owners.filter((owner) => ownerStatus(owner) === 'unreachable').map(ownerName);
  if (unconfigured.length === 0 && unreachable.length === 0) return null;

  return (
    <View className="bg-card flex-row flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl px-4 py-3.5 shadow-md shadow-black/[0.05]">
      <View className="min-w-64 flex-1 flex-row items-start gap-3">
        <Icon name="wifi-off" className="text-muted-foreground mt-0.5 size-4" />
        <View className="min-w-0 flex-1 gap-1">
          {unreachable.length > 0 ? (
            <Text variant="caption" className="text-foreground">
              {t('screens.settings.connection.unreachable', { names: spokenList(unreachable, t('common.and')) })}
            </Text>
          ) : null}
          {unconfigured.length > 0 ? (
            <Text variant="caption" className="text-foreground">
              {t('screens.settings.connection.unconfigured', { names: spokenList(unconfigured, t('common.and')) })}
            </Text>
          ) : null}
          {unconfigured.length > 0 ? (
            <Text variant="caption">{t('screens.settings.connection.unconfigured-hint')}</Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row gap-2">
        {unconfigured.length > 0 ? (
          <Button size="sm" variant="ghost" onPress={onDetails}>
            <Text>{t('screens.settings.connection.details')}</Text>
          </Button>
        ) : null}
        {unreachable.length > 0 ? (
          <Button size="sm" variant="outline" onPress={onRetry}>
            <Text>{t('common.retry')}</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}
