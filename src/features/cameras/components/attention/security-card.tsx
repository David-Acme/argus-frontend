import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { useCameraCounts } from '@/features/cameras/hooks/use-camera-counts';
import { SECURITY_HREF } from '@/features/cameras/constants/routes.constant';

export function SecurityCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const counts = useCameraCounts();
  return (
    <Row
      leading={<Avatar icon="shield" tone="accent" />}
      title={t('screens.navigation.security')}
      meta={
        counts
          ? t('screens.cameras.card.online', {
              online: String(counts.online),
              total: String(counts.total),
            })
          : t('screens.cameras.card.none')
      }
      chevron
      onPress={() => router.push(SECURITY_HREF)}
    />
  );
}
