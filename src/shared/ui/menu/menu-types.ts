import type { ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

export type MenuItem = {
  label: string;
  icon?: IconGlyph;
  destructive?: boolean;
  onPress: () => void;
};

export type MenuItems = readonly [MenuItem, MenuItem, ...MenuItem[]];

export type ButtonMenuProps = {
  label: string;
  items: MenuItems;
  icon?: IconGlyph;
};

export type ContextMenuProps = {
  context: true;
  label: string;
  items: MenuItems;
  children: ReactNode;
};

export type MenuProps = ButtonMenuProps | ContextMenuProps;
