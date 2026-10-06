import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { PRIVACY_SIGNAL_ICONS } from '@/features/privacy/constants/privacy';
import { usePrivacyDirectory } from '@/features/privacy/hooks/use-privacy-directory';
import { usePrivacySignals } from '@/features/privacy/hooks/use-privacy-signals';

type UserPrivacyRowProps = {
  userId: number;
};

export function UserPrivacyRow({ userId }: UserPrivacyRowProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const { directory } = usePrivacyDirectory();
  const signals = usePrivacySignals(directory?.applicable);
  const state = directory?.users.find((user) => user.userId === userId);

  if (!state) return null;

  const summary = !state.decided
    ? t('screens.privacy.person.undecided')
    : !state.current
      ? t('screens.privacy.person.outdated')
      : t('screens.privacy.person.accepted', {
          date: dates.formatFullDate(new Date((state.updatedAt ?? state.decidedAt ?? 0) * 1000)),
        });

  return (
    <View className="bg-surface-secondary gap-3 rounded-2xl px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Icon name="shield-check" className="text-foreground-secondary size-5" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="label">{t('screens.privacy.person.title')}</Text>
          <Text variant="caption">{summary}</Text>
        </View>
      </View>
      {state.decided ? (
        <View className="flex-row flex-wrap gap-2">
          {signals.map((signal) => {
            const on = state.choices[signal];
            return (
              <View
                key={signal}
                accessibilityLabel={`${t(`screens.privacy.signal.${signal}`)}: ${
                  on ? t('screens.privacy.person.on') : t('screens.privacy.person.off')
                }`}
                className={cn(
                  'flex-row items-center gap-1.5 rounded-full px-2.5 py-1',
                  on ? 'bg-card dark:bg-card-secondary' : 'border-border border'
                )}>
                <Icon
                  name={on ? PRIVACY_SIGNAL_ICONS[signal] : 'eye-off'}
                  className={cn('size-3.5', on ? 'text-success' : 'text-muted-foreground')}
                />
                <Text variant="micro" className={on ? 'text-foreground' : undefined}>
                  {t(`screens.privacy.signal.${signal}`)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
      <Text variant="micro">{t('screens.privacy.person.owner-note')}</Text>
    </View>
  );
}
