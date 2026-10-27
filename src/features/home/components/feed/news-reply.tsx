import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { FeedItem } from '@/shared/ui/feed-item';
import { useNewsStamp } from '@/features/home/components/feed/news-item';
import { newsWordsOf } from '@/features/home/model/news';

export type NewsReplyProps = { entry: INotificationPreviewCacheRow; now: number };

export function NewsReply({ entry, now }: NewsReplyProps) {
  const { t } = useTranslation();
  const stamp = useNewsStamp(now);
  const words = newsWordsOf(entry, t('screens.home.news.sender'));
  return (
    <FeedItem
      leading={<Avatar icon="repeat" size="small" round />}
      who={words.who}
      when={stamp(entry.createdAt) ?? ''}
      text={words.text}
      unreadLabel={entry.isRead ? undefined : t('screens.home.thread.unread')}
    />
  );
}
