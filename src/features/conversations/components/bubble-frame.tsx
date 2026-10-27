import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Menu } from '@/shared/ui/menu';
import type { MenuItems } from '@/shared/ui/menu';
import { BubbleMore } from '@/features/conversations/components/bubble-more';

export type BubbleFrameProps = { items: MenuItems | null; label: string; children: ReactNode };

export function BubbleFrame({ items, label, children }: BubbleFrameProps) {
  if (!items) return <>{children}</>;
  return (
    <Menu context label={label} items={items}>
      <View className="group">
        {children}
        <BubbleMore items={items} />
      </View>
    </Menu>
  );
}
