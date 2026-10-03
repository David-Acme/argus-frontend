import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { Panel } from '@/shared/components/ui/panel';

export type CameraSummaryCounts = {
  total: number;
  online: number;
  offline: number;
  disabled: number;
  zones: number;
  events: number;
  continuous: number;
};

type CameraSummaryProps = {
  counts: CameraSummaryCounts;
  layout: 'strip' | 'panel';
  compact?: boolean;
};

type SummarySegment = {
  key: string;
  value: number;
  className: string;
};

type SummaryBarProps = {
  segments: readonly SummarySegment[];
};

type SummaryStatProps = {
  label: string;
  value: number;
  dotClassName?: string;
  className?: string;
};

type SummaryLegendRowProps = {
  label: string;
  value: number;
  dotClassName: string;
};

function SummaryBar({ segments }: SummaryBarProps) {
  return (
    <View className="bg-surface-secondary h-2 w-full flex-row gap-0.5 overflow-hidden rounded-full">
      {segments.map((segment) =>
        segment.value > 0 ? (
          <View key={segment.key} className={cn('h-full', segment.className)} style={{ flex: segment.value }} />
        ) : null,
      )}
    </View>
  );
}

function SummaryStat({ label, value, dotClassName, className }: SummaryStatProps) {
  return (
    <View className={cn('gap-0.5', className)}>
      <Text variant="headline">{value}</Text>
      <View className="flex-row items-center gap-1.5">
        {dotClassName ? <View className={cn('size-2 rounded-full', dotClassName)} /> : null}
        <Text variant="micro" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function SummaryLegendRow({ label, value, dotClassName }: SummaryLegendRowProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={cn('size-2 rounded-full', dotClassName)} />
      <Text variant="caption" className="text-foreground-secondary flex-1" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

export function CameraSummary({ counts, layout, compact = false }: CameraSummaryProps) {
  const { t } = useTranslation();
  const health: readonly SummarySegment[] = [
    { key: 'online', value: counts.online, className: 'bg-success' },
    { key: 'offline', value: counts.offline, className: 'bg-error' },
    { key: 'disabled', value: counts.disabled, className: 'bg-border' },
  ];
  const recording: readonly SummarySegment[] = [
    { key: 'events', value: counts.events, className: 'bg-accent' },
    { key: 'continuous', value: counts.continuous, className: 'bg-interactive' },
  ];

  if (layout === 'strip') {
    return (
      <Panel className="gap-4">
        <View className="flex-row flex-wrap gap-y-4">
          <SummaryStat
            label={t('screens.cameras.summary.online')}
            value={counts.online}
            dotClassName="bg-success"
            className={compact ? 'w-1/2' : 'flex-1'}
          />
          <SummaryStat
            label={t('screens.cameras.summary.offline')}
            value={counts.offline}
            dotClassName="bg-error"
            className={compact ? 'w-1/2' : 'flex-1'}
          />
          <SummaryStat
            label={t('screens.cameras.summary.disabled')}
            value={counts.disabled}
            dotClassName="bg-border"
            className={compact ? 'w-1/2' : 'flex-1'}
          />
          <SummaryStat
            label={t('screens.cameras.summary.zones')}
            value={counts.zones}
            className={compact ? 'w-1/2' : 'flex-1'}
          />
        </View>
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text variant="micro">{t('screens.cameras.summary.recording')}</Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1.5">
                <View className="bg-accent size-2 rounded-full" />
                <Text variant="micro" numberOfLines={1}>
                  {`${t('screens.cameras.summary.events')} ${counts.events}`}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="bg-interactive size-2 rounded-full" />
                <Text variant="micro" numberOfLines={1}>
                  {`${t('screens.cameras.summary.continuous')} ${counts.continuous}`}
                </Text>
              </View>
            </View>
          </View>
          <SummaryBar segments={recording} />
        </View>
      </Panel>
    );
  }

  return (
    <Panel className="gap-5 p-5">
      <Text variant="micro">{t('screens.cameras.summary.title')}</Text>
      <View className="gap-3">
        <View className="flex-row items-baseline gap-2">
          <Text variant="display">{`${counts.online}/${counts.total}`}</Text>
          <Text variant="caption">{t('screens.cameras.summary.connected')}</Text>
        </View>
        <SummaryBar segments={health} />
        <View className="gap-2">
          <SummaryLegendRow
            label={t('screens.cameras.summary.online')}
            value={counts.online}
            dotClassName="bg-success"
          />
          <SummaryLegendRow
            label={t('screens.cameras.summary.offline')}
            value={counts.offline}
            dotClassName="bg-error"
          />
          <SummaryLegendRow
            label={t('screens.cameras.summary.disabled')}
            value={counts.disabled}
            dotClassName="bg-border"
          />
        </View>
      </View>
      <View className="bg-divider h-px w-full" />
      <SummaryStat label={t('screens.cameras.summary.zones')} value={counts.zones} />
      <View className="bg-divider h-px w-full" />
      <View className="gap-3">
        <Text variant="micro">{t('screens.cameras.summary.recording')}</Text>
        <SummaryBar segments={recording} />
        <View className="gap-2">
          <SummaryLegendRow
            label={t('screens.cameras.summary.events')}
            value={counts.events}
            dotClassName="bg-accent"
          />
          <SummaryLegendRow
            label={t('screens.cameras.summary.continuous')}
            value={counts.continuous}
            dotClassName="bg-interactive"
          />
        </View>
      </View>
    </Panel>
  );
}
