import { Pressable, View } from 'react-native';
import type { GuardExpectedGuest } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SecurityEmpty } from './security-empty';

type ExpectedGuestListProps = {
  guests: GuardExpectedGuest[];
  now: number;
  onRemove?: (guest: GuardExpectedGuest) => void;
};

export function ExpectedGuestList({ guests, now, onRemove }: ExpectedGuestListProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();

  if (guests.length === 0) {
    return (
      <SecurityEmpty
        icon="users"
        title={t('screens.security.guests.empty')}
        hint={t('screens.security.guests.empty-hint')}
        className="min-h-44"
      />
    );
  }

  return (
    <View className="-mx-3 min-h-44 gap-1">
      {guests.map((guest) => {
        const until = new Date(guest.validUntil * 1000);
        const expired = until.getTime() <= now;
        const time = date.sameDay(until, new Date(now))
          ? date.formatTime(until)
          : `${date.formatDayMonth(until)} ${date.formatTime(until)}`;
        return (
          <View
            key={guest.id}
            className="min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-2.5">
            <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
              <Icon name="user-check" className="text-foreground-secondary size-5" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="body" numberOfLines={1} className="font-medium">
                {guest.description}
              </Text>
              <Text variant="caption">
                {expired
                  ? t('screens.security.guests.expired')
                  : t('screens.security.guests.until', { time })}
              </Text>
            </View>
            {guest.oneTime ? (
              <View className="bg-surface-secondary rounded-full px-2.5 py-1">
                <Text variant="micro">{t('screens.security.guests.once')}</Text>
              </View>
            ) : null}
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.security.guests.remove-title')}
                hitSlop={8}
                onPress={() => onRemove(guest)}
                className="size-10 items-center justify-center rounded-full active:opacity-60">
                <Icon name="trash" className="text-muted-foreground size-5" />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
