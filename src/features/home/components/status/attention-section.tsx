import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useAttention } from '@/shared/libs/surfaces';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

export function AttentionSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const items = useAttention();
  if (items.length === 0) return null;
  return (
    <Section title={t('screens.home.inicio.sections.attention')}>
      {items.map((item) => (
        <Row
          key={item.id}
          leading={<Avatar icon={item.icon} tone="alert" />}
          title={item.title}
          meta={item.meta}
          chevron
          onPress={() => router.push(item.href)}
        />
      ))}
    </Section>
  );
}
