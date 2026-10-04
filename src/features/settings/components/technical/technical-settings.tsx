import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { SETTINGS_OWNER_ICONS } from '@/features/settings/components/settings-owner-list';
import type { TransferMode } from '@/features/settings/components/technical/settings-transfer-dialog';
import { TechnicalOwnerHeader } from '@/features/settings/components/technical/technical-owner-header';
import { TechnicalSettingRow } from '@/features/settings/components/technical/technical-setting-row';
import { useVoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { overviewCounts, technicalGroups } from '@/features/settings/model/settings-catalog';
import { ownerName, rowText } from '@/features/settings/model/setting-text';

type TechnicalSettingsProps = {
  overview: SettingsOverview;
  initialService: SettingsOwnerName | 'all';
  onChange: (owner: SettingsOwnerName, key: string, value: string) => void;
  onTransfer: (owner: SettingsOwner, mode: TransferMode) => void;
};

type ViewFilter = 'all' | 'changed' | 'restart';

export function TechnicalSettings({ overview, initialService, onChange, onTransfer }: TechnicalSettingsProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const preview = useVoicePreview();
  const [query, setQuery] = useState('');
  const [service, setService] = useState<SettingsOwnerName | 'all'>(initialService);
  const [view, setView] = useState<ViewFilter>('all');
  const counts = overviewCounts(overview);

  const groups = useMemo(
    () =>
      technicalGroups(
        overview,
        { query, service, changed: view === 'changed', restart: view === 'restart' },
        rowText,
        ownerName
      ),
    [overview, query, service, view]
  );
  const shown = groups.reduce((sum, group) => sum + group.rows.length, 0);

  const serviceOptions = [
    { value: 'all' as const, label: t('screens.settings.technical.all-services') },
    ...overview.owners.map((owner) => ({
      value: owner.service,
      label: ownerName(owner),
      icon: SETTINGS_OWNER_ICONS[owner.service],
    })),
  ];
  const viewOptions = [
    { value: 'all' as const, label: t('screens.settings.technical.view.all', { count: String(counts.total) }) },
    {
      value: 'changed' as const,
      label: t('screens.settings.technical.view.changed', { count: String(counts.changed) }),
    },
    { value: 'restart' as const, label: t('screens.settings.technical.view.restart') },
  ];

  return (
    <View className="gap-4">
      <View className={isCompact ? 'gap-3' : 'flex-row items-center gap-3'}>
        <View className={isCompact ? 'w-full' : 'w-80'}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('screens.settings.technical.search')}
            accessibilityLabel={t('screens.settings.technical.search')}
            autoCapitalize="none"
            autoCorrect={false}
            className="pl-10"
          />
          <View pointerEvents="none" className="absolute bottom-0 left-3.5 top-0 justify-center">
            <Icon name="search" className="text-muted-foreground size-4" />
          </View>
        </View>
        <FilterChips scroll options={viewOptions} value={view} onChange={setView} />
      </View>
      <FilterChips scroll options={serviceOptions} value={service} onChange={setService} />
      <Text variant="caption">
        {t('screens.settings.technical.summary', {
          shown: String(shown),
          total: String(counts.total),
          changed: String(counts.changed),
          pending: String(counts.pending),
        })}
      </Text>

      {groups.length === 0 ? (
        <Panel className="items-center gap-2 py-10">
          <Icon name="search" className="text-muted-foreground size-5" />
          <Text variant="label">{t('screens.settings.technical.no-results')}</Text>
          <Text variant="caption">{t('screens.settings.technical.no-results-hint')}</Text>
        </Panel>
      ) : (
        groups.map((group) => (
          <Panel key={group.owner.service} className="gap-0 p-5">
            <TechnicalOwnerHeader
              owner={group.owner}
              shown={group.rows.length}
              onExport={() => onTransfer(group.owner, 'export')}
              onImport={() => onTransfer(group.owner, 'import')}
            />
            <View className="divide-border-subtle divide-y">
              {group.rows.map((row) => (
                <TechnicalSettingRow
                  key={row.setting.key}
                  setting={row.setting}
                  siblings={row.owner.settings}
                  preview={preview}
                  onChange={(value) => onChange(row.owner.service, row.setting.key, value)}
                />
              ))}
            </View>
          </Panel>
        ))
      )}
    </View>
  );
}
