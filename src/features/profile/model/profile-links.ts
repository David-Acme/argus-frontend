import type { AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';

export type ProfileTab = 'home' | 'account' | 'argus';

export type ProfileLinkKey =
  | 'people'
  | 'visitors'
  | 'modules'
  | 'sessions'
  | 'privacy'
  | 'calls'
  | 'safety'
  | 'proximity'
  | 'settings'
  | 'activity'
  | 'appearance'
  | 'language';

export type ProfileHref =
  | '/users'
  | '/people'
  | '/users/visitors'
  | '/settings/modules'
  | '/profile/modules'
  | '/profile/sessions'
  | '/profile/privacy'
  | '/profile/calls'
  | '/profile/safety'
  | '/profile/proximity'
  | '/settings'
  | '/settings/activity'
  | '/profile/appearance'
  | '/profile/language';

export type ProfileLink = { key: ProfileLinkKey; href: ProfileHref };

export type ProfileLinks = Readonly<Record<ProfileTab, readonly ProfileLink[]>>;

type Candidate = readonly [ProfileLinkKey, readonly ProfileHref[]];

const CANDIDATES: Readonly<Record<ProfileTab, readonly Candidate[]>> = {
  home: [
    ['people', ['/users', '/people']],
    ['visitors', ['/users/visitors']],
    ['modules', ['/settings/modules', '/profile/modules']],
  ],
  account: [
    ['sessions', ['/profile/sessions']],
    ['privacy', ['/profile/privacy']],
    ['calls', ['/profile/calls']],
    ['safety', ['/profile/safety']],
    ['proximity', ['/profile/proximity']],
  ],
  argus: [
    ['settings', ['/settings']],
    ['activity', ['/settings/activity']],
    ['appearance', ['/profile/appearance']],
    ['language', ['/profile/language']],
  ],
};

export const PROFILE_TABS: readonly ProfileTab[] = ['home', 'account', 'argus'];

function linksOf(view: AccessView, candidates: readonly Candidate[]): ProfileLink[] {
  return candidates.flatMap(([key, hrefs]) => {
    const href = hrefs.find((candidate) => routeFallback(candidate, view) === null);
    return href ? [{ key, href }] : [];
  });
}

export function profileLinks(view: AccessView): ProfileLinks {
  return {
    home: linksOf(view, CANDIDATES.home),
    account: linksOf(view, CANDIDATES.account),
    argus: linksOf(view, CANDIDATES.argus),
  };
}

export function profileTabs(links: ProfileLinks, homeExtras: boolean): ProfileTab[] {
  return PROFILE_TABS.filter((tab) => links[tab].length > 0 || (tab === 'home' && homeExtras));
}
