import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import type { IconName } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { TimelineItem } from '@/shared/components/ui/timeline';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { ModuleEnableAction } from '@/features/modules';
import { WATCH_NOTIFICATION_ICONS, WatchNotificationAction, watchNotificationKind } from '@/features/watch';
import { SightNoticeActions, useSightNotice } from '@/features/security';
import {
  isThreadRead,
  messageCounterpartOf,
  missedCallId,
  moduleRequestOf,
  phaseOf,
  rowTimes,
  type NotificationPhase,
  type NotificationThread,
  type NotificationUrgency,
} from '@/features/home/model/notification-threads';

type NotificationThreadRowProps = {
  thread: NotificationThread;
  now: number;
  compact?: boolean;
  expandable?: boolean;
  onRead?: (thread: NotificationThread) => void;
  onDelete?: (thread: NotificationThread) => void;
};

type ThreadTone = { tile: string; icon: string; dot: string; title: string };

type TimelineEntryProps = {
  entry: INotificationPreviewCacheRow;
  last: boolean;
  times: (row: INotificationPreviewCacheRow) => string[];
  phaseLabel: (phase: NotificationPhase) => string;
};

const TONES: Record<NotificationUrgency, ThreadTone> = {
  critical: {
    tile: 'bg-error/10',
    icon: 'text-error-strong',
    dot: 'bg-error',
    title: 'text-foreground',
  },
  time_sensitive: {
    tile: 'bg-warning/15',
    icon: 'text-warning-strong',
    dot: 'bg-warning',
    title: 'text-foreground',
  },
  active: {
    tile: 'bg-surface-secondary',
    icon: 'text-foreground-secondary',
    dot: 'bg-interactive',
    title: 'text-foreground',
  },
  passive: {
    tile: 'bg-surface-secondary',
    icon: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    title: 'text-foreground-secondary',
  },
};

const KIND_ICONS: Readonly<Record<string, IconName>> = {
  guard_episode: 'shield',
  guard_tamper: 'triangle-alert',
  guard_tamper_ask: 'eye-off',
  maintenance_view_check: 'scan-eye',
  camera_maintenance_notice: 'wrench',
  guard_digest: 'history',
  camera_fallback: 'video',
  camera_fallback_digest: 'history',
  call: 'phone',
  module_request: 'blocks',
  assistant_task: 'messages-square',
  ...WATCH_NOTIFICATION_ICONS,
  household_message: 'messages-square',
};

const PHASE_KEYS = {
  opened: 'opened',
  escalated: 'escalated',
  resolved: 'resolved',
  daily: 'daily',
  after_quiet: 'after-quiet',
} as const satisfies Record<NotificationPhase, string>;

const rowHover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

function iconOf(thread: NotificationThread): IconName {
  if (thread.phase === 'after_quiet') return 'moon';
  return (thread.kind && KIND_ICONS[thread.kind]) || 'bell';
}

function TimelineEntry({ entry, last, times, phaseLabel }: TimelineEntryProps) {
  const phase = phaseOf(entry);
  const meta = [...times(entry), phase ? phaseLabel(phase) : null].filter(
    (part): part is string => part !== null
  );
  return (
    <TimelineItem last={last} className="gap-0.5">
      {meta.length > 0 ? (
        <Text variant="micro" className="text-muted-foreground">
          {meta.join(' · ')}
        </Text>
      ) : null}
      <Text variant="caption" className="text-foreground font-medium" numberOfLines={1}>
        {entry.title}
      </Text>
      {entry.body ? (
        <Text variant="caption" className="text-foreground-secondary" numberOfLines={2}>
          {entry.body}
        </Text>
      ) : null}
    </TimelineItem>
  );
}

export function NotificationThreadRow({
  thread,
  now,
  compact = false,
  expandable = false,
  onRead,
  onDelete,
}: NotificationThreadRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const date = useDateFormatter();
  const [expanded, setExpanded] = useState(false);
  const { latest } = thread;
  const tone = TONES[thread.urgency ?? 'active'];
  const read = isThreadRead(thread);
  const count = thread.entries.length;
  const canExpand = expandable && count > 1;
  const callId = onRead ? missedCallId(thread) : null;
  const counterpartId = onRead ? messageCounterpartOf(thread) : null;
  const pressable = canExpand || callId !== null || counterpartId !== null || (onRead != null && !read);
  const critical = thread.urgency === 'critical';
  const request = moduleRequestOf(thread);
  const watchKind = watchNotificationKind(thread.kind);
  const sight = useSightNotice(thread.kind, latest.data);
  const title = sight?.title ?? latest.title;

  const stamp = (at: number): string | null => {
    if (!at) return null;
    const value = new Date(at);
    return date.sameDay(value, new Date(now)) ? date.formatTime(value) : date.formatDayMonth(value);
  };
  const times = (row: INotificationPreviewCacheRow): string[] =>
    rowTimes(row, {
      stamp,
      said: (time) => t('screens.home.thread.said-at', { time }),
      delivered: (time) => t('screens.home.thread.delivered-at', { time }),
    });
  const phaseLabel = (phase: NotificationPhase) =>
    t(`screens.home.thread.phase.${PHASE_KEYS[phase]}`);
  const meta = [
    ...times(latest),
    thread.phase && (count > 1 || thread.phase !== 'opened') ? phaseLabel(thread.phase) : null,
    count > 1 ? t('screens.home.thread.count', { count: String(count) }) : null,
  ].filter((part): part is string => part !== null);

  const accessibilityLabel = [
    critical ? t('screens.home.thread.urgent') : null,
    read ? null : t('screens.home.thread.unread'),
    title,
    latest.body,
    ...meta,
  ]
    .filter((part): part is string => Boolean(part))
    .join('. ');

  const press = () => {
    if (canExpand) setExpanded((open) => !open);
    if (!read) onRead?.(thread);
    if (callId) router.push(`/call?callId=${callId}`);
    if (counterpartId !== null) router.push(`/conversations/${counterpartId}`);
  };

  const content = (
    <>
      <View
        className={cn(
          'items-center justify-center rounded-xl',
          compact ? 'size-8' : 'size-9',
          tone.tile
        )}>
        <Icon name={iconOf(thread)} className={cn('size-4', tone.icon)} />
        {read ? null : (
          <View
            className={cn(
              'border-card absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2',
              tone.dot
            )}
          />
        )}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text variant="label" numberOfLines={1} className={cn('min-w-0 flex-1', tone.title)}>
            {title}
          </Text>
          {canExpand ? (
            <Icon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              className="text-muted-foreground size-4"
            />
          ) : null}
        </View>
        {latest.body ? (
          <Text
            variant="caption"
            className="text-foreground-secondary"
            numberOfLines={expanded ? undefined : 2}>
            {latest.body}
          </Text>
        ) : null}
        {meta.length > 0 || critical ? (
          <Text variant="micro" className="text-muted-foreground">
            {critical ? (
              <Text variant="micro" className="text-error-strong font-semibold">
                {t('screens.home.thread.urgent')}
              </Text>
            ) : null}
            {critical && meta.length > 0 ? ' · ' : null}
            {meta.join(' · ')}
          </Text>
        ) : null}
        {sight ? <SightNoticeActions notice={sight.notice} onAnswered={() => onRead?.(thread)} /> : null}
        {request ? (
          <View className="pt-1.5">
            <ModuleEnableAction moduleId={request.moduleId} onDone={() => onRead?.(thread)} />
          </View>
        ) : null}
        {watchKind ? (
          <WatchNotificationAction kind={watchKind} data={latest.data} onDone={() => onRead?.(thread)} />
        ) : null}
        {expanded ? (
          <View className="pt-2">
            {thread.entries.slice(1).map((entry, index, older) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                last={index === older.length - 1}
                times={times}
                phaseLabel={phaseLabel}
              />
            ))}
          </View>
        ) : null}
      </View>
    </>
  );

  const className = cn(
    'flex-row items-start gap-3 rounded-2xl px-2',
    compact ? 'py-1.5' : 'py-2',
    onDelete ? 'min-w-0 flex-1' : '-mx-2'
  );

  const row = pressable ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        canExpand ? t('screens.home.thread.show-history') : t('screens.home.thread.mark-read')
      }
      accessibilityState={canExpand ? { expanded } : undefined}
      onPress={press}
      className={cn(className, 'active:bg-surface-secondary', rowHover)}>
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );

  if (!onDelete) return row;

  return (
    <View className="-mx-2 flex-row items-start">
      {row}
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={t('screens.home.thread.delete', { title: latest.title })}
        onPress={() => onDelete(thread)}>
        <Icon name="trash" className="text-muted-foreground size-4" />
      </Button>
    </View>
  );
}
