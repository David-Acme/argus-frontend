import { useRouter } from 'expo-router';
import type { GuardEpisode } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { Feed, FeedItem } from '@/shared/ui/feed-item';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useHappened, type HappenedFeed } from '@/features/security/hooks/use-happened';
import type { HappenedItem } from '@/features/security/model/happened';

type HappenedSectionProps = {
  feed: HappenedFeed & { reload: () => Promise<void> };
  limit?: number;
  feedForm: boolean;
  bare?: boolean;
  onOpen: (episode: GuardEpisode) => void;
};

type ItemsProps = { items: readonly HappenedItem[]; onOpen: (episode: GuardEpisode) => void };

const SKELETON = [0, 1, 2];

function HappenedRows({ items, onOpen }: ItemsProps) {
  const { t } = useTranslation();
  return items.map((item) => (
    <Row
      key={item.key}
      leading={<Avatar icon={item.icon} tone={item.tone} round />}
      title={item.title}
      meta={[item.where, item.when].filter(Boolean).join(' · ')}
      trailing={
        item.review ? <Chip label={t('screens.security.happened.review')} tone="attn" /> : undefined
      }
      chevron={!item.review}
      onPress={() => onOpen(item.episode)}
    />
  ));
}

function HappenedFeedItems({ items, onOpen }: ItemsProps) {
  const { t } = useTranslation();
  return (
    <Feed>
      {items.map((item) => (
        <FeedItem
          key={item.key}
          who={item.where}
          when={item.when}
          text={item.title}
          leading={<Avatar icon={item.icon} tone={item.tone} round />}
          unreadLabel={item.review ? t('screens.security.happened.pending') : undefined}
          onPress={() => onOpen(item.episode)}
          actions={
            item.review ? (
              <Button
                variant="primary"
                compact
                label={{
                  shown: t('screens.security.happened.review'),
                  spoken: t('screens.security.happened.review-label', {
                    what: item.title,
                    where: item.where,
                  }),
                }}
                onPress={() => onOpen(item.episode)}
              />
            ) : undefined
          }
        />
      ))}
    </Feed>
  );
}

export function HappenedSection({ feed, limit, feedForm, bare, onOpen }: HappenedSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { items, status } = useHappened(feed, limit);
  const title = bare ? undefined : t('screens.security.happened.title');
  const all = bare
    ? undefined
    : {
        label: t('screens.security.happened.all'),
        onPress: () => router.push('/security/episodes'),
      };
  if (status === 'loading')
    return (
      <Section title={title}>
        {SKELETON.map((index) => (
          <SkeletonRow key={index} />
        ))}
      </Section>
    );
  if (status === 'failed')
    return (
      <Section title={title} variant="plain">
        <Notice
          tone="attention"
          icon="wifioff"
          title={t('screens.security.happened.failed')}
          action={{ label: t('common.retry'), onPress: feed.reload }}
        />
      </Section>
    );
  if (status === 'empty')
    return (
      <Section title={title} variant="plain">
        <Notice
          icon="shieldok"
          title={t('screens.security.happened.empty')}
          body={t('screens.security.happened.empty-detail')}
        />
      </Section>
    );
  if (feedForm)
    return (
      <Section title={title} action={all} variant="plain">
        <HappenedFeedItems items={items} onOpen={onOpen} />
      </Section>
    );
  return (
    <Section title={title} action={all}>
      <HappenedRows items={items} onOpen={onOpen} />
    </Section>
  );
}
