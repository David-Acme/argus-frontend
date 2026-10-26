import { useRouter } from 'expo-router';
import { useHappened } from '@/features/home/hooks/use-happened';
import type { HappenedRow } from '@/features/home/model/happened';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Chip } from '@/shared/ui/chip';
import { Notice } from '@/shared/ui/notice';
import { Empty, SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

const SKELETON_ROWS = [0, 1, 2];

export function HappenedSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const happened = useHappened();
  const title = t('screens.home.camera-sections.happened');
  const openSecurity = () => router.push('/security');
  const row = (item: HappenedRow) => (
    <Row
      key={item.key}
      leading={<Avatar icon={item.icon} tone={item.attention ? 'attn' : 'default'} round />}
      title={item.title}
      meta={item.meta}
      trailing={
        item.review ? (
          <Chip label={t('screens.home.camera-sections.review')} tone="attn" />
        ) : undefined
      }
      chevron
      onPress={openSecurity}
    />
  );
  if (!happened.visible) return null;
  if (happened.status === 'ready') return <Section title={title}>{happened.rows.map(row)}</Section>;
  if (happened.status === 'loading')
    return (
      <Section title={title}>
        {SKELETON_ROWS.map((index) => (
          <SkeletonRow key={index} />
        ))}
      </Section>
    );
  return (
    <Section title={title} variant="plain">
      {happened.status === 'empty' ? (
        <Empty
          message={t('screens.home.camera-sections.happened-empty')}
          detail={t('screens.home.camera-sections.happened-empty-detail')}
          icon="shieldok"
          action={{ label: t('screens.home.camera-sections.open-security'), onPress: openSecurity }}
        />
      ) : (
        <Notice
          tone="attention"
          icon="wifioff"
          title={t('screens.home.camera-sections.happened-failed')}
          action={{ label: t('common.retry'), onPress: happened.retry }}
        />
      )}
    </Section>
  );
}
