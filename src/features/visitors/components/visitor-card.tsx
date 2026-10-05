import { Pressable, View } from 'react-native';
import type { VisitorSummary } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { VisitorFace } from '@/features/visitors/components/visitor-face';
import { VISITOR_CATEGORY_ICONS } from '@/features/visitors/constants';
import { isNamed } from '@/features/visitors/model/visitor';
import { categoryLabel, visitorLabel, visitsLabel } from '@/features/visitors/model/visitor-label';

type VisitorCardProps = {
  visitor: VisitorSummary;
  selected?: boolean;
  selectable?: boolean;
  onPress: (visitor: VisitorSummary) => void;
};

export function VisitorCard({ visitor, selected = false, selectable = false, onPress }: VisitorCardProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const label = visitorLabel(visitor, t);
  const lastSeen = new Date(visitor.lastSeenAt * 1000);
  const watch = visitor.category === 'watchlist';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selectable ? { selected } : undefined}
      accessibilityLabel={label}
      onPress={() => onPress(visitor)}
      className={cn(
        'bg-card border-border-subtle active:bg-surface-secondary gap-2.5 rounded-xl border p-2.5',
        selected && 'border-accent bg-accent-soft'
      )}>
      <View>
        <VisitorFace
          visitorId={visitor.id}
          sampleId={visitor.coverSampleId}
          hasCrop={visitor.coverSampleId !== null}
          category={visitor.category}
          label={label}
          className="aspect-square w-full rounded-lg"
        />
        {selectable ? (
          <View
            className={cn(
              'border-border absolute top-2 right-2 size-6 items-center justify-center rounded-full border-2',
              selected ? 'bg-interactive border-interactive' : 'bg-card'
            )}>
            {selected ? <Icon name="check" className="text-foreground-on-interactive size-3.5" /> : null}
          </View>
        ) : null}
      </View>
      <View className="gap-1 px-0.5">
        <Text variant="label" numberOfLines={1} className={cn(!isNamed(visitor) && 'text-foreground-secondary')}>
          {label}
        </Text>
        <Text variant="micro" numberOfLines={1}>
          {`${visitsLabel(visitor.visitCount, t)} · ${dates.formatDayMonth(lastSeen)} ${dates.formatTime(lastSeen)}`}
        </Text>
        {visitor.category ? (
          <StatusBadge
            label={categoryLabel(visitor.category, t)}
            icon={VISITOR_CATEGORY_ICONS[visitor.category]}
            className={cn('mt-0.5', watch && 'bg-error/15')}
            iconClassName={watch ? 'text-error-strong' : undefined}
            textClassName={watch ? 'text-error-strong' : undefined}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
