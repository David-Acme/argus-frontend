import { View } from 'react-native';
import type { FirstRunState } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { profileName, settingLabel } from '@/features/settings/model/profile-text';

type FirstRunBannerProps = {
  firstRun: FirstRunState;
  reverting: boolean;
  onRevert: () => void;
};

const LISTED_KEYS = 4;

export function FirstRunBanner({ firstRun, reverting, onRevert }: FirstRunBannerProps) {
  const { t } = useTranslation();
  const { formatDayMonth } = useDateFormatter();
  const keys = firstRun.owners.flatMap((owner) => owner.keys);
  const listed = keys.slice(0, LISTED_KEYS).map(settingLabel);
  const hidden = keys.length - listed.length;
  const name = profileName(firstRun.profile);
  const date = formatDayMonth(new Date(firstRun.appliedAt * 1000));

  return (
    <View className="bg-accent-soft flex-row flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl px-4 py-3.5">
      <View className="min-w-64 flex-1 flex-row items-start gap-3">
        <Icon name="sparkles" className="text-accent-strong mt-0.5 size-4" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="label">{t('screens.settings.first-run.title', { name, date })}</Text>
          <Text variant="caption">
            {keys.length === 0
              ? t('screens.settings.first-run.nothing')
              : hidden > 0
                ? t('screens.settings.first-run.changed-more', { keys: listed.join(', '), count: String(hidden) })
                : t('screens.settings.first-run.changed', { keys: listed.join(', ') })}
          </Text>
        </View>
      </View>
      {keys.length > 0 ? (
        <Button size="sm" variant="outline" loading={reverting} disabled={reverting} onPress={onRevert}>
          <Icon name="undo-2" className="text-foreground size-3.5" />
          <Text>{t('screens.settings.first-run.revert')}</Text>
        </Button>
      ) : null}
    </View>
  );
}
