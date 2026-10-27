import { useTranslation } from '@/shared/hooks/use-translation';
import type { MenuConfirm, MenuItem } from '@/shared/ui/menu';

export type ThreadMenuInput = {
  lead: readonly MenuItem[];
  clearable: boolean;
  clearWords: MenuConfirm;
  onSearch: () => void;
  onClear: () => unknown;
};

export function useThreadMenu({
  lead,
  clearable,
  clearWords,
  onSearch,
  onClear,
}: ThreadMenuInput): MenuItem[] {
  const { t } = useTranslation();
  const search: MenuItem = {
    label: t('screens.conversations.search.title'),
    icon: 'search',
    family: 'view',
    onPress: onSearch,
  };
  const clear: MenuItem = {
    label: t('screens.conversations.clear'),
    icon: 'trash',
    destructive: true,
    confirm: clearWords,
    onPress: onClear,
  };
  return [...lead, search, ...(clearable ? [clear] : [])];
}
