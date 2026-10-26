import type { TranslationKey } from '@/core/types';
import { ASSISTANT_THREAD_HREF, CAPABILITY } from '@/shared/constants';
import { hasCapability, type AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import type { IconGlyph } from '@/shared/ui/icon';

export type NavTabKey = 'home' | 'security' | 'argus' | 'agenda' | 'you';

export type NavSectionKey = NavTabKey | 'settings';

export type NavHref =
  '/' | '/security' | typeof ASSISTANT_THREAD_HREF | '/agenda' | '/profile' | '/settings';

export type NavTab = {
  key: NavSectionKey;
  href: NavHref;
  icon: IconGlyph;
  label: TranslationKey;
  argus?: boolean;
};

export type TabMove = 'stay' | 'home' | 'push' | 'replace';

export const NAV_TABS: readonly NavTab[] = [
  { key: 'home', href: '/', icon: 'home', label: 'screens.navigation.home' },
  { key: 'security', href: '/security', icon: 'shield', label: 'screens.navigation.security' },
  {
    key: 'argus',
    href: ASSISTANT_THREAD_HREF,
    icon: 'cmd',
    label: 'screens.navigation.argus',
    argus: true,
  },
  { key: 'agenda', href: '/agenda', icon: 'cal', label: 'screens.navigation.agenda' },
  { key: 'you', href: '/profile', icon: 'user', label: 'screens.navigation.you' },
];

export const SETTINGS_TAB: NavTab = {
  key: 'settings',
  href: '/settings',
  icon: 'sliders',
  label: 'screens.navigation.settings',
};

const SECTION_OF_SEGMENT: Readonly<Record<string, NavSectionKey>> = {
  security: 'security',
  cameras: 'security',
  watch: 'security',
  conversations: 'argus',
  agenda: 'agenda',
  projects: 'agenda',
  notification: 'home',
  settings: 'settings',
  profile: 'you',
  people: 'you',
  users: 'you',
};

const BAR_HIDDEN: readonly RegExp[] = [
  /^\/cameras\/?$/,
  /^\/conversations\/[^/]+/,
  /^\/security\/[^/]+/,
  /^\/users\/visitors(\/|$)/,
  /^\/settings\/(proximity|activity)(\/|$)/,
  /^\/watch(\/|$)/,
];

const pathOf = (pathname: string): string => pathname.split(/[?#]/)[0] ?? pathname;

export function visibleTabs(view: AccessView): NavTab[] {
  return NAV_TABS.filter(
    (tab) =>
      routeFallback(tab.href, view) === null &&
      (!tab.argus || hasCapability(view, CAPABILITY.assistantVoice))
  );
}

export const settingsVisible = (view: AccessView): boolean =>
  routeFallback(SETTINGS_TAB.href, view) === null;

export function sectionOf(pathname: string, withSettings: boolean): NavSectionKey {
  const segment = pathOf(pathname).split('/')[1] ?? '';
  const section = SECTION_OF_SEGMENT[segment] ?? 'home';
  return section === 'settings' && !withSettings ? 'you' : section;
}

export const barShownOn = (pathname: string): boolean =>
  !BAR_HIDDEN.some((pattern) => pattern.test(pathOf(pathname)));

export function tabMove(from: string, to: NavHref): TabMove {
  const path = pathOf(from);
  if (path === to) return 'stay';
  if (to === '/') return 'home';
  return path === '/' ? 'push' : 'replace';
}
