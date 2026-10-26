import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size, useWindowLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { ProfileHero } from '@/features/profile/components/profile-hero';
import { ProfileTabs } from '@/features/profile/components/profile-tabs';
import { WeekPane } from '@/features/profile/components/week-pane';
import { profileLinks } from '@/features/profile/model/profile-links';
import type { ProfileLinks } from '@/features/profile/model/profile-links';

type TopActionsProps = { links: ProfileLinks };

const NO_GROWTH = -1;

function TopActions({ links }: TopActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const activity = links.argus.find((link) => link.key === 'activity');
  const settings = links.argus.find((link) => link.key === 'settings');
  if (!activity && !settings) return null;
  return (
    <View className="flex-row gap-2">
      {activity ? (
        <Button
          iconOnly
          glass
          icon="activity"
          label={t('screens.profile.activity')}
          onPress={() => router.push(activity.href)}
        />
      ) : null}
      {settings ? (
        <Button
          iconOnly
          glass
          icon="gear"
          label={t('screens.profile.settings')}
          onPress={() => router.push(settings.href)}
        />
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { windowClass } = useWindowLayout();
  const links = profileLinks(useAccessView());
  const split = windowClass !== 'compact';
  const actions = <TopActions links={links} />;
  return (
    <Screen columns="panes" aura="calm" actions={split ? undefined : actions}>
      <ScreenColumns>
        <ScreenColumn
          label={t('screens.profile.title')}
          width={windowClass === 'medium' ? size.columnWide : size.columnProfile}
          grows={0}>
          <View>
            {split ? (
              <View className="min-h-top-bar flex-row items-center justify-end">{actions}</View>
            ) : null}
            <ProfileHero />
            <ProfileTabs links={links} />
          </View>
        </ScreenColumn>
        {split ? (
          <ScreenColumn label={t('screens.profile.week.title')} grows={NO_GROWTH}>
            <WeekPane />
          </ScreenColumn>
        ) : null}
      </ScreenColumns>
    </Screen>
  );
}
