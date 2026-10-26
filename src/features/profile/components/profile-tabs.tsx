import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { FilterChip } from '@/shared/ui/chip';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useSignOut } from '@/features/sessions';
import { HomePanel } from '@/features/profile/components/home-panel';
import {
  PROFILE_LINK_LOOK,
  PROFILE_TAB_LABEL,
} from '@/features/profile/constants/profile-links.constant';
import { useHousehold } from '@/features/profile/hooks/use-household';
import { useLinkMeta } from '@/features/profile/hooks/use-link-meta';
import type { LinkMeta } from '@/features/profile/hooks/use-link-meta';
import { profileTabs } from '@/features/profile/model/profile-links';
import type { ProfileLink, ProfileLinks, ProfileTab } from '@/features/profile/model/profile-links';

type ProfileTabsProps = { links: ProfileLinks };

type LinkRowsProps = { links: readonly ProfileLink[]; meta: LinkMeta };

function LinkRows({ links, meta }: LinkRowsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  if (links.length === 0) return null;
  return (
    <Section>
      {links.map((link) => {
        const look = PROFILE_LINK_LOOK[link.key];
        return (
          <Row
            key={link.key}
            leading={<Avatar icon={look.icon} tone={look.tone} />}
            title={t(look.title)}
            meta={meta(link.key)}
            chevron
            onPress={() => router.push(link.href)}
            testID={`profile-link-${link.key}`}
          />
        );
      })}
    </Section>
  );
}

function SignOut() {
  const { t } = useTranslation();
  const { signOut } = useSignOut();
  return (
    <Section>
      <Row
        danger
        leading={<Avatar icon="logout" tone="alert" />}
        title={t('screens.profile.sign-out.title')}
        meta={t('screens.profile.sign-out.meta')}
        onPress={() => void signOut()}
      />
    </Section>
  );
}

export function ProfileTabs({ links }: ProfileTabsProps) {
  const { t } = useTranslation();
  const household = useHousehold();
  const meta = useLinkMeta(household);
  const extras =
    household.summary !== null || household.steps.pending.length > 0 || household.invites;
  const tabs = profileTabs(links, extras);
  const [chosen, setChosen] = useState<ProfileTab>('home');
  const tab = tabs.includes(chosen) ? chosen : (tabs[0] ?? 'account');
  const people = links.home.find((link) => link.key === 'people');
  const peopleHref = people?.href === '/users' || people?.href === '/people' ? people.href : null;
  return (
    <View className="mt-6">
      <View
        role="tablist"
        aria-label={t('screens.profile.tabs.label')}
        className="web:sticky web:top-0 web:z-10 bg-bg flex-row gap-2 py-2">
        {tabs.map((key) => (
          <FilterChip
            key={key}
            size="stat"
            label={t(PROFILE_TAB_LABEL[key])}
            selected={key === tab}
            onPress={() => setChosen(key)}
            testID={`profile-tab-${key}`}
          />
        ))}
      </View>
      {tab === 'home' ? <HomePanel household={household} peopleHref={peopleHref} /> : null}
      <LinkRows links={links[tab]} meta={meta} />
      {tab === 'account' ? <SignOut /> : null}
    </View>
  );
}
