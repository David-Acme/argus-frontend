import { View } from 'react-native';
import type { ConversationDeliveryState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { DELIVERY_STATE_ICONS } from '@/features/conversations/constants';
import { DELIVERY_STATE_KEYS } from '@/features/conversations/model/conversation-labels';

type DeliveryStateProps = {
  state: ConversationDeliveryState;
  className?: string;
};

export function DeliveryState({ state, className }: DeliveryStateProps) {
  const { t } = useTranslation();
  const expired = state === 'expired';

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <Icon
        name={DELIVERY_STATE_ICONS[state]}
        className={cn('size-3.5', expired ? 'text-warning-strong' : 'text-muted-foreground')}
      />
      <Text variant="micro" className={expired ? 'text-warning-strong' : 'text-muted-foreground'}>
        {t(DELIVERY_STATE_KEYS[state])}
      </Text>
    </View>
  );
}
