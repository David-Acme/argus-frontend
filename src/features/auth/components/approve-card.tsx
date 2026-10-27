import { View } from 'react-native';
import type { DeviceLoginDetails } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { fallbackNameOf, fromHome, originKeyOf } from '@/features/auth/model/approve';

export type ApproveCardProps = { details: DeviceLoginDetails };

export function ApproveCard({ details }: ApproveCardProps) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormatter();
  const device = details.deviceName || t(fallbackNameOf(details.platform));
  return (
    <View className="w-full">
      <Section>
        <Row title={t('screens.approve.device')} trailing={device} />
        <Row title={t('screens.approve.where')} trailing={t(originKeyOf(details.origin))} />
        <Row
          title={t('screens.approve.when')}
          trailing={t('screens.approve.now', {
            time: formatTime(new Date(details.createdAt * 1000)),
          })}
        />
      </Section>
      {fromHome(details) ? null : (
        <View className="mt-3">
          <Notice
            inline
            tone="attention"
            icon="alert"
            title={t('screens.approve.remote-warning')}
          />
        </View>
      )}
    </View>
  );
}
