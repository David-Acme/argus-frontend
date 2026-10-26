import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Feed } from '@/shared/ui/feed-item';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { NotificationLinkScreen } from '@/features/notification';
import { NewsItem } from '@/features/home/components/feed/news-item';
import { useNews } from '@/features/home/hooks/use-news';

const MINUTE_MS = 60_000;

function NewsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const now = useNow(MINUTE_MS);
  const { threads, read, feed } = useNews();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen title={t('screens.home.recent')} back={{ label: t('common.back'), onPress: back }}>
      <Section variant="plain">
        {threads.length === 0 ? (
          <Notice icon="bell" title={t('screens.home.news.empty')} />
        ) : (
          <Feed>
            {threads.map((thread) => (
              <NewsItem key={thread.key} thread={thread} now={now} onRead={read} />
            ))}
          </Feed>
        )}
      </Section>
      {feed.hasMore ? (
        <Section variant="plain">
          <Button block label={t('screens.home.news.more')} onPress={feed.loadMore} />
        </Section>
      ) : null}
    </Screen>
  );
}

export default function NewsScreen() {
  const { notificationId } = useLocalSearchParams<{ notificationId?: string }>();
  return notificationId ? <NotificationLinkScreen /> : <NewsList />;
}
