import { View } from 'react-native';
import type { AuthSession } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SESSION_PLATFORM_ICONS } from '@/features/sessions/model/sessions';

type ThisDeviceCardProps = {
  session: AuthSession;
  name: string;
  detail: string;
  since: string;
  closing: boolean;
  onClose: () => void;
};

export function ThisDeviceCard({
  session,
  name,
  detail,
  since,
  closing,
  onClose,
}: ThisDeviceCardProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-surface-secondary gap-4 rounded-2xl p-4">
      <View className="flex-row items-center gap-3">
        <View className="bg-card size-11 items-center justify-center rounded-full">
          <Icon
            name={SESSION_PLATFORM_ICONS[session.platform]}
            className="text-foreground size-5"
          />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="body" numberOfLines={1} className="font-medium">
            {name}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {detail}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <StatusBadge
          label={t('screens.sessions.this-device')}
          dotClassName="bg-success"
          surface="card"
        />
        <Text variant="micro">{since}</Text>
      </View>
      <Button variant="outline" loading={closing} onPress={onClose}>
        <Icon name="log-out" className="size-4" />
        <Text>{t('screens.sessions.close-here')}</Text>
      </Button>
    </View>
  );
}
