import { Image, View } from 'react-native';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

type PersonDetailsDialogProps = {
  person: IPeopleDirectoryCacheRow | null;
  roleLabel: string;
  portraitUri: string | null;
  portraitLoading: boolean;
  onVerify: () => void;
  onClose: () => void;
};

export function PersonDetailsDialog({
  person,
  roleLabel,
  portraitUri,
  portraitLoading,
  onVerify,
  onClose,
}: PersonDetailsDialogProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();

  return (
    <AdaptiveDialog
      open={person !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t('screens.users.person-details')}
      closeLabel={t('common.close')}
      contentClassName="sm:max-w-[390px]">
      {person ? (
        <View className="gap-5 pb-1">
          <View className="flex-row items-center gap-3">
            <View className="bg-surface-secondary size-12 items-center justify-center rounded-full">
              <Icon name="user" className="text-foreground-secondary size-6" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="headline">
                {[person.name, person.lastName].filter(Boolean).join(' ')}
              </Text>
              <Text variant="caption" className="text-foreground-secondary">
                {roleLabel}
              </Text>
            </View>
          </View>
          <View className="bg-surface-secondary gap-1 rounded-2xl px-3.5 py-3">
            <Text variant="caption" className="text-foreground-secondary">
              {t('screens.users.member-since', {
                date: date.formatDayMonth(new Date(person.createdAt)),
              })}
            </Text>
            <Text
              variant="label"
              className={person.isActive ? 'text-success' : 'text-foreground-secondary'}>
              {person.isActive ? t('screens.users.active') : t('screens.users.inactive')}
            </Text>
          </View>
          <View className="gap-1.5">
            <Text variant="label">{t('screens.users.portrait-verification')}</Text>
            <Text variant="caption">{t('screens.users.portrait-private')}</Text>
            {portraitUri ? (
              <Image
                source={{ uri: portraitUri }}
                className="bg-surface-secondary mt-1 h-52 w-full rounded-2xl"
                resizeMode="cover"
                accessibilityLabel={t('screens.users.portrait-verification')}
              />
            ) : (
              <Button
                className="mt-1 self-start"
                variant="outline"
                loading={portraitLoading}
                onPress={onVerify}>
                <Icon name="eye" className="size-4" />
                <Text>{t('screens.users.verify-portrait')}</Text>
              </Button>
            )}
          </View>
        </View>
      ) : null}
    </AdaptiveDialog>
  );
}
