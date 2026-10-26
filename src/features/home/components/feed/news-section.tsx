import { useRouter } from 'expo-router';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowHeight } from '@/shared/theme';
import { Feed } from '@/shared/ui/feed-item';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { NewsItem } from '@/features/home/components/feed/news-item';
import { useNews } from '@/features/home/hooks/use-news';
import { NEWS_ROUTE, newsLimit } from '@/features/home/model/news';

const MINUTE_MS = 60_000;

export function NewsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const column = useInScreenColumn();
  const height = useWindowHeight();
  const now = useNow(MINUTE_MS);
  const { readable, threads, read } = useNews();

  if (!readable || threads.length === 0) return null;

  return (
    <Section
      title={t('screens.home.recent')}
      action={{ label: t('screens.home.see-all'), onPress: () => router.push(NEWS_ROUTE) }}
      variant="plain">
      <Feed>
        {threads.slice(0, newsLimit(column, height)).map((thread) => (
          <NewsItem key={thread.key} thread={thread} now={now} onRead={read} />
        ))}
      </Feed>
    </Section>
  );
}
