import { View } from 'react-native';
import type { SettingsOwner } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { cn } from '@/shared/libs/utils';
import { SETTINGS_OWNER_ICONS } from '@/features/settings/components/settings-owner-list';
import { ownerStatus, pendingRestartKeys } from '@/features/settings/model/settings-catalog';
import { ownerName } from '@/features/settings/model/setting-text';
import { profileName } from '@/features/settings/model/profile-text';

type TechnicalOwnerHeaderProps = {
  owner: SettingsOwner;
  shown: number;
  onExport: () => void;
  onImport: () => void;
};

const STATUS_DOT = {
  connected: 'bg-success',
  unreachable: 'bg-warning',
  unconfigured: 'bg-border',
} as const;

export function TechnicalOwnerHeader({ owner, shown, onExport, onImport }: TechnicalOwnerHeaderProps) {
  const { t } = useTranslation();
  const { formatDayMonth } = useDateFormatter();
  const status = ownerStatus(owner);
  const pending = pendingRestartKeys(owner);
  const marker = owner.profile ?? null;
  const markerText =
    marker === null
      ? null
      : t(`screens.settings.technical.marker.${marker.origin}`, {
          name: profileName(marker.id),
          date: formatDayMonth(new Date(marker.appliedAt * 1000)),
        });

  return (
    <View className="gap-3 pb-1">
      <View className="flex-row flex-wrap items-center gap-3">
        <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
          <Icon name={SETTINGS_OWNER_ICONS[owner.service]} className="text-foreground-secondary size-5" />
        </View>
        <View className="min-w-40 flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="headline">{ownerName(owner)}</Text>
            <StatusBadge
              label={t(`screens.settings.technical.status.${status}`)}
              dotClassName={STATUS_DOT[status]}
            />
            {owner.capabilities?.includes('gpu') ? (
              <StatusBadge label={t('screens.settings.technical.gpu')} icon="cpu" />
            ) : null}
          </View>
          <Text variant="micro">
            {status === 'connected'
              ? t('screens.settings.technical.shown', { count: String(shown), total: String(owner.settings.length) })
              : t(`screens.settings.technical.status-hint.${status}`)}
          </Text>
        </View>
        {status === 'connected' ? (
          <View className="flex-row gap-2">
            <Button size="sm" variant="outline" onPress={onExport}>
              <Icon name="download" className="text-foreground size-3.5" />
              <Text>{t('screens.settings.transfer.export')}</Text>
            </Button>
            <Button size="sm" variant="outline" onPress={onImport}>
              <Icon name="upload" className="text-foreground size-3.5" />
              <Text>{t('screens.settings.transfer.import')}</Text>
            </Button>
          </View>
        ) : null}
      </View>
      {owner.configFile ? (
        <View className="flex-row items-center gap-2">
          <Icon name="file-cog" className="text-muted-foreground size-3.5" />
          <Text variant="micro" selectable numberOfLines={2} className="text-foreground-secondary min-w-0 flex-1 font-mono">
            {owner.configFile}
          </Text>
        </View>
      ) : null}
      {markerText ? (
        <Text variant="micro" className="text-foreground-secondary">
          {markerText}
        </Text>
      ) : null}
      {pending.length > 0 ? (
        <View className={cn('bg-surface-secondary flex-row items-start gap-2.5 rounded-2xl px-3.5 py-3')}>
          <Icon name="refresh-cw" className="text-warning-strong mt-0.5 size-4" />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text variant="label">
              {pending.length === 1
                ? t('screens.settings.technical.pending-one')
                : t('screens.settings.technical.pending-other', { count: String(pending.length) })}
            </Text>
            <Text variant="caption">
              {t('screens.settings.technical.pending-hint', { service: `argus-${owner.service}` })}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
