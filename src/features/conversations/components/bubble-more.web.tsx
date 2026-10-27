import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Menu } from '@/shared/ui/menu';
import type { MenuItems } from '@/shared/ui/menu';

export type BubbleMoreProps = { items: MenuItems };

const MORE_PLACE = { position: 'absolute', top: 0, right: 0 } as const;

export function BubbleMore({ items }: BubbleMoreProps) {
  const { t } = useTranslation();
  return (
    <View
      style={MORE_PLACE}
      className="web:opacity-0 web:group-hover:opacity-100 web:group-focus-within:opacity-100">
      <Menu item label={t('screens.conversations.actions.label')} items={items} icon="chevd" />
    </View>
  );
}
