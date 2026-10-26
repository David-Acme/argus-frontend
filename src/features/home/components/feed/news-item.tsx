import { useRouter } from 'expo-router';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { FeedItem } from '@/shared/ui/feed-item';
import { ModuleEnableAction } from '@/features/modules';
import { notificationHrefOf } from '@/features/notification';
import { SightNoticeActions, useSightNotice } from '@/features/security';
import { WatchNotificationAction, watchNotificationKind } from '@/features/watch';
import {
  newsActionOf,
  newsAvatarOf,
  newsPressable,
  newsStampOf,
  newsTargetOf,
  newsWordsOf,
  type NewsAction,
} from '@/features/home/model/news';
import {
  isThreadRead,
  moduleRequestOf,
  rowTimes,
  type NotificationThread,
} from '@/features/home/model/notification-threads';

export type NewsItemProps = {
  thread: NotificationThread;
  now: number;
  onRead: (thread: NotificationThread) => void;
  onRemove?: (thread: NotificationThread) => void;
};

type NewsActionsProps = {
  thread: NotificationThread;
  action: NewsAction;
  sight: ReturnType<typeof useSightNotice>;
  onRead: () => void;
  onOpen: () => void;
  onRemove?: () => void;
};

const ACTION_KEYS = {
  review: 'screens.home.news.review',
  reply: 'screens.home.news.reply',
  'call-back': 'screens.home.news.call-back',
} as const;

function useNewsWhen(thread: NotificationThread, now: number): string {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const stamp = (at: number): string | null => {
    const value = newsStampOf(at, now);
    if (value === null) return null;
    const time = date.formatTime(value.at);
    if (value.kind === 'today') return time;
    if (value.kind === 'yesterday') return t('screens.home.news.yesterday', { time });
    const day =
      value.kind === 'week' ? date.formatWeekdayShort(value.at) : date.formatDayMonth(value.at);
    return day.charAt(0).toLocaleUpperCase() + day.slice(1);
  };
  const count = thread.entries.length;
  return [
    ...rowTimes(thread.latest, {
      stamp,
      said: (time) => t('screens.home.thread.said-at', { time }),
      delivered: (time) => t('screens.home.thread.delivered-at', { time }),
    }),
    ...(count > 1 ? [t('screens.home.thread.count', { count: String(count) })] : []),
  ].join(' · ');
}

function NewsActions({ thread, action, sight, onRead, onOpen, onRemove }: NewsActionsProps) {
  const { t } = useTranslation();
  const request = action === 'module' ? moduleRequestOf(thread) : null;
  const watchKind = watchNotificationKind(thread.kind);
  return (
    <>
      {sight ? <SightNoticeActions notice={sight.notice} onAnswered={onRead} /> : null}
      {request ? <ModuleEnableAction moduleId={request.moduleId} onDone={onRead} /> : null}
      {watchKind ? (
        <WatchNotificationAction kind={watchKind} data={thread.latest.data} onDone={onRead} />
      ) : null}
      {action === 'review' || action === 'reply' || action === 'call-back' ? (
        <Button compact label={t(ACTION_KEYS[action])} onPress={onOpen} />
      ) : null}
      {onRemove ? (
        <Button
          iconOnly
          compact
          icon="x"
          iconSize="small"
          label={t('screens.home.thread.delete', { title: thread.latest.title })}
          onPress={onRemove}
        />
      ) : null}
    </>
  );
}

export function NewsItem({ thread, now, onRead, onRemove }: NewsItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const sight = useSightNotice(thread.kind, thread.latest.data);
  const target = newsTargetOf(thread, notificationHrefOf);
  const { has, moduleActive } = useCapabilities();
  const manages = has(CAPABILITY.modulesManage);
  const action = newsActionOf(thread, target, (moduleId) => manages && !moduleActive(moduleId));
  const avatar = newsAvatarOf(thread);
  const words = newsWordsOf(thread.latest, t('screens.home.news.sender'), sight?.title ?? null);
  const when = useNewsWhen(thread, now);
  const acts =
    sight !== null ||
    watchNotificationKind(thread.kind) !== null ||
    action !== null ||
    onRemove !== undefined;
  const read = () => onRead(thread);
  const open = () => {
    read();
    if (target !== null) router.push(target);
  };

  return (
    <FeedItem
      leading={
        <Avatar
          icon={avatar.icon}
          presence={avatar.argus ? 'idle' : undefined}
          tone={avatar.tone}
          round
        />
      }
      who={words.who}
      when={when}
      text={words.text}
      unreadLabel={isThreadRead(thread) ? undefined : t('screens.home.thread.unread')}
      actions={
        acts ? (
          <NewsActions
            thread={thread}
            action={action}
            sight={sight}
            onRead={read}
            onOpen={open}
            onRemove={onRemove ? () => onRemove(thread) : undefined}
          />
        ) : undefined
      }
      onPress={newsPressable(thread, target) ? open : undefined}
    />
  );
}
