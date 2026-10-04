import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { formatRelative, healthOf, relativeTime, type CameraView } from '@/features/cameras/model/camera-overview';
import { HEALTH_LABEL, STATUS_DOT, STATUS_LABEL, healthNeedsAttention } from '@/features/cameras/model/camera-status';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

export type CameraSummaryCounts = {
  total: number;
  online: number;
  offline: number;
  disabled: number;
  zones: number;
  events: number;
  continuous: number;
  detectionsToday: number;
  watching: number;
  attention: number;
};

type CameraSummaryProps = {
  counts: CameraSummaryCounts;
  layout: 'strip' | 'panel';
  views?: readonly CameraView[];
  now?: number;
  className?: string;
  onOpen?: (id: string) => void;
};

type CameraStatusListProps = {
  views: readonly CameraView[];
  now: number;
  onOpen?: (id: string) => void;
};

type HealthBarProps = {
  counts: CameraSummaryCounts;
};

type SummaryRowProps = {
  icon: IconName;
  label: string;
  value: number;
  tone?: 'default' | 'warning';
};

type SummaryTileProps = {
  label: string;
  value: string;
  dotClassName?: string;
};

function SummaryRow({ icon, label, value, tone = 'default' }: SummaryRowProps) {
  return (
    <View className="min-h-9 flex-row items-center gap-2.5">
      <Icon
        name={icon}
        className={cn('size-4', tone === 'warning' && value > 0 ? 'text-warning-strong' : 'text-muted-foreground')}
      />
      <Text variant="caption" className="text-foreground-secondary flex-1" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="label">{String(value)}</Text>
    </View>
  );
}

function SummaryTile({ label, value, dotClassName }: SummaryTileProps) {
  return (
    <View className="min-w-[120px] flex-1 gap-0.5">
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

function HealthBar({ counts }: HealthBarProps) {
  const segments = [
    { key: 'online', value: counts.online, className: 'bg-success' },
    { key: 'offline', value: counts.offline, className: 'bg-error' },
    { key: 'disabled', value: counts.disabled, className: 'bg-border' },
  ];
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

const STATUS_LIST_LIMIT = 10;

function CameraStatusList({ views, now, onOpen }: CameraStatusListProps) {
  const { t } = useTranslation();
  const shown = views.slice(0, STATUS_LIST_LIMIT);
  return (
    <View className="gap-0.5">
      <Text variant="micro" className="pb-1">
        {t('screens.cameras.summary.cameras')}
      </Text>
      {shown.map((view) => {
        const seen = relativeTime(view.live?.lastSeenAt ?? 0, now);
        const health = healthOf(view.live);
        const note =
          view.status === 'online' && healthNeedsAttention(health)
            ? t(HEALTH_LABEL[health])
            : view.status !== 'online'
              ? t(STATUS_LABEL[view.status])
              : seen
                ? formatRelative(t, seen)
                : '';
        return (
          <Pressable
            key={view.camera.id}
            accessibilityRole="button"
            onPress={() => onOpen?.(view.camera.id)}
            className="web:hover:bg-surface-secondary -mx-2 min-h-9 flex-row items-center gap-2.5 rounded-xl px-2 active:opacity-70">
            <View className={cn('size-2 rounded-full', STATUS_DOT[view.status])} />
            <Text variant="caption" className="text-foreground flex-1" numberOfLines={1}>
              {view.camera.name}
            </Text>
            <Text variant="micro" numberOfLines={1}>
              {note}
            </Text>
          </Pressable>
        );
      })}
      {views.length > shown.length ? (
        <Text variant="micro" className="pt-1">
          {t('screens.cameras.summary.more', { count: String(views.length - shown.length) })}
        </Text>
      ) : null}
    </View>
  );
}

export function CameraSummary({ counts, layout, views, now = 0, className, onOpen }: CameraSummaryProps) {
  const { t } = useTranslation();

  if (layout === 'strip') {
    return (
      <Panel className={cn('gap-3', className)}>
        <View className="flex-row flex-wrap gap-x-4 gap-y-3">
          <SummaryTile
            label={t('screens.cameras.summary.online')}
            value={`${counts.online}/${counts.total}`}
            dotClassName="bg-success"
          />
          <SummaryTile label={t('screens.cameras.summary.detections-today')} value={String(counts.detectionsToday)} />
          <SummaryTile label={t('screens.cameras.summary.watching')} value={String(counts.watching)} />
          <SummaryTile label={t('screens.cameras.summary.zones')} value={String(counts.zones)} />
        </View>
        <HealthBar counts={counts} />
      </Panel>
    );
  }

  return (
    <Panel title={t('screens.cameras.summary.title')} className={className}>
      <View className="gap-3">
        <View className="flex-row items-baseline gap-2">
          <Text variant="display">{`${counts.online}/${counts.total}`}</Text>
          <Text variant="caption">{t('screens.cameras.summary.connected')}</Text>
        </View>
        <HealthBar counts={counts} />
      </View>
      <View className="bg-divider h-px w-full" />
      <View>
        <SummaryRow icon="wifi-off" label={t('screens.cameras.summary.offline')} value={counts.offline} tone="warning" />
        <SummaryRow icon="square" label={t('screens.cameras.summary.disabled')} value={counts.disabled} />
        <SummaryRow
          icon="triangle-alert"
          label={t('screens.cameras.summary.attention')}
          value={counts.attention}
          tone="warning"
        />
        <SummaryRow icon="activity" label={t('screens.cameras.summary.detections-today')} value={counts.detectionsToday} />
        <SummaryRow icon="eye" label={t('screens.cameras.summary.watching')} value={counts.watching} />
        <SummaryRow icon="shield" label={t('screens.cameras.summary.zones')} value={counts.zones} />
        <SummaryRow icon="video" label={t('screens.cameras.summary.continuous')} value={counts.continuous} />
      </View>
      {views && views.length > 0 ? (
        <>
          <View className="bg-divider h-px w-full" />
          <CameraStatusList views={views} now={now} onOpen={onOpen} />
        </>
      ) : null}
    </Panel>
  );
}
