import { View } from 'react-native';
import type { AuthSession } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { SESSION_PLATFORM_ICONS } from '@/features/sessions/model/sessions';

type SessionRowProps = {
  session: AuthSession;
  name: string;
  detail: string;
  since: string;
  onClose: () => void;
};

export function SessionRow({ session, name, detail, since, onClose }: SessionRowProps) {
  const { t } = useTranslation();
  const { isWide } = useWindowClass();

  return (
    <View className="min-h-16 flex-row items-center gap-3 py-3">
      <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
        <Icon
          name={SESSION_PLATFORM_ICONS[session.platform]}
          className="text-foreground-secondary size-5"
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="body" numberOfLines={1} className="font-medium">
          {name}
        </Text>
        <Text variant="caption" numberOfLines={isWide ? 1 : 2}>
          {detail}
        </Text>
        <Text variant="micro" numberOfLines={1}>
          {since}
        </Text>
      </View>
      <Button
        variant="ghost"
        size={isWide ? 'sm' : 'icon'}
        accessibilityLabel={t('screens.sessions.close-label', { name })}
        onPress={onClose}>
        <Icon name="log-out" className="text-foreground-secondary size-4" />
        {isWide ? <Text>{t('screens.sessions.close')}</Text> : null}
      </Button>
    </View>
  );
}
