import type { LanguagePreference, ThemePreference, TranslationKey } from '@/core/types';
import type { AvatarTone } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import type { ProfileLinkKey, ProfileTab } from '@/features/profile/model/profile-links';

export type LinkLook = { icon: IconGlyph; title: TranslationKey; tone?: AvatarTone };

export const PROFILE_LINK_LOOK: Readonly<Record<ProfileLinkKey, LinkLook>> = {
  people: { icon: 'users', title: 'screens.profile.links.people.title' },
  visitors: { icon: 'face', title: 'screens.profile.links.visitors.title' },
  modules: { icon: 'grid', title: 'screens.profile.links.modules.title' },
  sessions: { icon: 'devices', title: 'screens.profile.links.sessions.title' },
  privacy: { icon: 'lock', title: 'screens.profile.links.privacy.title' },
  calls: { icon: 'phone', title: 'screens.profile.links.calls.title' },
  safety: { icon: 'shieldok', title: 'screens.profile.links.safety.title' },
  proximity: { icon: 'door', title: 'screens.profile.links.proximity.title' },
  settings: { icon: 'gear', title: 'screens.profile.links.settings.title', tone: 'accent' },
  activity: { icon: 'activity', title: 'screens.profile.links.activity.title' },
  appearance: { icon: 'sun', title: 'screens.profile.links.appearance.title' },
  language: { icon: 'globe', title: 'screens.profile.links.language.title' },
};

export const PROFILE_LINK_META: Readonly<Partial<Record<ProfileLinkKey, TranslationKey>>> = {
  visitors: 'screens.profile.links.visitors.meta',
  modules: 'screens.profile.links.modules.meta',
  sessions: 'screens.profile.links.sessions.meta',
  privacy: 'screens.profile.links.privacy.meta',
  calls: 'screens.profile.links.calls.meta',
  safety: 'screens.profile.links.safety.meta',
  proximity: 'screens.profile.links.proximity.meta',
  settings: 'screens.profile.links.settings.meta',
  activity: 'screens.profile.links.activity.meta',
  language: 'screens.profile.links.language.meta',
};

export const PROFILE_TAB_LABEL: Readonly<Record<ProfileTab, TranslationKey>> = {
  home: 'screens.profile.tabs.home',
  account: 'screens.profile.tabs.account',
  argus: 'screens.profile.tabs.argus',
};

export const THEME_LABEL: Readonly<Record<ThemePreference, TranslationKey>> = {
  system: 'screens.profile.theme.system',
  light: 'screens.profile.theme.light',
  dark: 'screens.profile.theme.dark',
};

export const LANGUAGE_LABEL: Readonly<Record<LanguagePreference, TranslationKey>> = {
  system: 'common.language-name.system',
  es: 'common.language-name.es',
  en: 'common.language-name.en',
};

export const PROFILE_HREF = {
  people: '/users',
  invite: { pathname: '/users', params: { invite: '1' } },
  approve: '/approve',
} as const;
