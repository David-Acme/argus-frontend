import type { IconName, TranslationKey } from '@/core/types';
import { peopleAccessOf, type AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';

export type ProfileLink = {
  key: 'people' | 'settings';
  href: '/users' | '/people' | '/settings';
  icon: IconName;
  title: TranslationKey;
};

export function profileLinks(view: AccessView): ProfileLink[] {
  const people = peopleAccessOf(view).profileAction;
  const links: ProfileLink[] = [];
  if (people)
    links.push({
      key: 'people',
      href: people === 'manage' ? '/users' : '/people',
      icon: 'users',
      title: 'screens.profile.people',
    });
  if (routeFallback('/settings', view) === null)
    links.push({
      key: 'settings',
      href: '/settings',
      icon: 'settings',
      title: 'screens.navigation.settings',
    });
  return links;
}
