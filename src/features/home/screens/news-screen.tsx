import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import { Feed } from '@/shared/ui/feed-item';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { NewsItem } from '@/features/home/components/feed/news-item';
import { NewsReply } from '@/features/home/components/feed/news-reply';
import { NEWS_FILTER_LABEL } from '@/features/home/constants/news.constant';
import { useNewsScreen } from '@/features/home/hooks/use-news-screen';
import type { NewsScreenState } from '@/features/home/hooks/use-news-screen';
import { threadReplies } from '@/features/home/model/news-filter';

type StateProps = { state: NewsScreenState };

function StatusNotices({ state }: StateProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { link, offline, syncedAt } = state;
  if (!link.gone && !offline) return null;
  return (
    <Section variant="plain">
      <View className="gap-3">
        {link.gone ? (
          <Notice
            icon="bell"
            title={t('screens.notification.gone')}
            body={t('screens.notification.gone-hint')}
            action={{ label: t('common.close'), onPress: link.forget }}
          />
        ) : null}
        {offline ? (
          <Notice
            inline
            tone="attention"
            icon="wifioff"
            title={
              syncedAt
                ? t('screens.home.news.stale', { time: date.formatTime(new Date(syncedAt)) })
                : t('screens.home.news.offline')
            }
          />
        ) : null}
      </View>
    </Section>
  );
}

function Empty({ state }: StateProps) {
  const { t } = useTranslation();
  if (state.filter === 'pending')
    return (
      <Notice
        icon="check"
        title={t('screens.home.news.empty-pending')}
        body={t('screens.home.news.empty-pending-hint')}
      />
    );
  if (state.filter === 'security')
    return (
      <Notice
        icon="shieldok"
        title={t('screens.home.news.empty-security')}
        body={t('screens.home.news.empty-security-hint')}
      />
    );
  return (
    <Notice
      icon="bell"
      title={t('screens.home.news.empty')}
      body={t('screens.home.news.empty-hint')}
    />
  );
}

function Threads({ state }: StateProps) {
  const { threads, now, news, remove } = state;
  return (
    <Feed>
      {threads.flatMap((thread) => {
        const replies = threadReplies(thread);
        return [
          <NewsItem
            key={thread.key}
            thread={thread}
            now={now}
            onRead={news.read}
            onRemove={remove ?? undefined}
            threadLine={replies.length > 0}
          />,
          ...replies.map((entry) => (
            <NewsReply key={`${thread.key}:${entry.id}`} entry={entry} now={now} />
          )),
        ];
      })}
    </Feed>
  );
}

function More({ state }: StateProps) {
  const { t } = useTranslation();
  if (state.moreFailed)
    return (
      <Section variant="plain">
        <Notice
          inline
          tone="attention"
          icon="wifioff"
          title={t('screens.home.news.more-failed')}
          action={{ label: t('common.retry'), onPress: state.retryMore }}
        />
      </Section>
    );
  if (!state.news.feed.hasMore) return null;
  return (
    <Section variant="plain">
      <Button block label={t('screens.home.news.more')} onPress={state.loadMore} />
    </Section>
  );
}

export default function NewsScreen() {
  const { t } = useTranslation();
  const state = useNewsScreen();
  return (
    <Screen
      title={t('screens.home.recent')}
      back={{ label: t('common.back'), onPress: state.back }}
      refresh={state.refresh}>
      <StatusNotices state={state} />
      {state.news.threads.length > 0 ? (
        <Section variant="plain">
          <Choice
            label={t('screens.home.news.filter.label')}
            options={state.filters.map((value) => ({ value, label: t(NEWS_FILTER_LABEL[value]) }))}
            value={state.filter}
            onChange={state.pick}
          />
        </Section>
      ) : null}
      <Section variant="plain">
        {state.threads.length === 0 ? <Empty state={state} /> : <Threads state={state} />}
      </Section>
      <More state={state} />
    </Screen>
  );
}
