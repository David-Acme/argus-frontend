import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { SECURITY_MAINTENANCE_HREF } from '@/features/cameras/constants/routes.constant';

export function MaintenanceSection() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Section title={t('screens.cameras.sections.maintenance')}>
      <Row
        leading={<Avatar icon="key" />}
        title={t('screens.cameras.sections.maintenance-row')}
        meta={t('screens.cameras.sections.maintenance-meta')}
        chevron
        onPress={() => router.push(SECURITY_MAINTENANCE_HREF)}
      />
    </Section>
  );
}
