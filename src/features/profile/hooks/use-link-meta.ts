import { useLocaleStore } from '@/core/stores';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  LANGUAGE_LABEL,
  PROFILE_LINK_META,
} from '@/features/profile/constants/profile-links.constant';
import { useAppearanceLine } from '@/features/profile/hooks/use-appearance-line';
import { joinNames } from '@/features/profile/model/household';
import type { ProfileLinkKey } from '@/features/profile/model/profile-links';
import type { Household } from '@/features/profile/hooks/use-household';

export type LinkMeta = (key: ProfileLinkKey) => string;

export function useLinkMeta(household: Household): LinkMeta {
  const { t } = useTranslation();
  const { activeModules, moduleNames } = useCapabilities();
  const appearance = useAppearanceLine();
  const language = useLocaleStore((state) => state.language);
  const and = t('common.and');

  const peopleMeta = () => {
    const { names, invitations, invites } = household;
    if (names.length <= 1 && invites) return t('screens.profile.links.people.alone');
    if (names.length === 0) return t('screens.profile.links.people.empty');
    const pending =
      invitations === 0
        ? null
        : invitations === 1
          ? t('screens.profile.links.people.pending-one')
          : t('screens.profile.links.people.pending-many', { count: String(invitations) });
    return [joinNames(names, and), pending].filter(Boolean).join(' · ');
  };

  const modulesMeta = () => {
    const names = [...activeModules].flatMap((id) => {
      const name = moduleNames.get(id);
      return name ? [name] : [];
    });
    return names.length > 0 ? joinNames(names, and) : t('screens.profile.links.modules.meta');
  };

  return (key) => {
    if (key === 'people') return peopleMeta();
    if (key === 'modules') return modulesMeta();
    if (key === 'language') return t(LANGUAGE_LABEL[language]);
    if (key === 'appearance') return appearance;
    const meta = PROFILE_LINK_META[key];
    return meta ? t(meta) : '';
  };
}
