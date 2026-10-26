import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { FilterChip } from '@/shared/ui/chip';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type AgendaView = 'agenda' | 'day';

export type AgendaTopProps = {
  month: string;
  expanded: boolean;
  view: AgendaView;
  onToggleMonth: () => void;
  onView: (view: AgendaView) => void;
  onSearch?: () => void;
  onProjects?: () => void;
};

export function AgendaTop({
  month,
  expanded,
  view,
  onToggleMonth,
  onView,
  onSearch,
  onProjects,
}: AgendaTopProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-3 pb-3">
      <View className="min-h-top-bar flex-row items-center justify-between gap-2">
        <PressableSurface
          a11y={{
            label: t(
              expanded ? 'screens.agenda.page.month-close' : 'screens.agenda.page.month-open'
            ),
            role: 'button',
          }}
          onPress={onToggleMonth}
          className="min-h-target-min flex-row items-center gap-1">
          <Text variant="title" heading={1}>
            {month}
          </Text>
          <Icon name="chevd" size="small" />
        </PressableSurface>
        {onSearch ? (
          <Button
            iconOnly
            icon="search"
            label={t('screens.agenda.page.search')}
            onPress={onSearch}
          />
        ) : null}
      </View>
      <View role="tablist" aria-label={t('screens.agenda.page.views')} className="flex-row gap-2">
        <FilterChip
          size="view"
          label={t('screens.agenda.page.view-agenda')}
          selected={view === 'agenda'}
          onPress={() => onView('agenda')}
        />
        <FilterChip
          size="view"
          label={t('screens.agenda.page.view-day')}
          selected={view === 'day'}
          onPress={() => onView('day')}
        />
        {onProjects ? (
          <FilterChip
            size="view"
            label={t('screens.agenda.page.view-projects')}
            selected={false}
            onPress={onProjects}
          />
        ) : null}
      </View>
    </View>
  );
}
