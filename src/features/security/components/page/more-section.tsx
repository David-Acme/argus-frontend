import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { MORE_HREF, useMore, type MoreFacts } from '@/features/security/hooks/use-more';
import type { MoreKey } from '@/features/security/model/more-rows';

type MoreSectionProps = MoreFacts & { without?: MoreKey };

export function MoreSection({ guests, environments, without }: MoreSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const rows = useMore({ guests, environments }).filter((row) => row.key !== without);
  return (
    <Section title={t('screens.security.more.title')}>
      {rows.map((row) => (
        <Row
          key={row.key}
          leading={<Avatar icon={row.icon} />}
          title={row.title}
          meta={row.meta || undefined}
          chevron
          onPress={() => router.push(MORE_HREF[row.key])}
        />
      ))}
    </Section>
  );
}
