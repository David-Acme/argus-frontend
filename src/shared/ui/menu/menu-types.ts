import type { ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

export const menuFamilies = ['edit', 'share', 'state', 'view', 'argus', 'caution'] as const;

export type MenuFamily = (typeof menuFamilies)[number];

export type MenuConfirm = { title: string; body: string; confirmLabel: string };

export type MenuAction = {
  label: string;
  icon: IconGlyph;
  family?: MenuFamily;
  destructive?: false;
  onPress: () => void;
};

export type MenuDanger = {
  label: string;
  icon: IconGlyph;
  destructive: true;
  confirm: MenuConfirm | 'by-action';
  onPress: () => unknown;
};

export type MenuItem = MenuAction | MenuDanger;

export type MenuItems = readonly [MenuItem, ...MenuItem[]];

export const hasMenuItems = (items: readonly MenuItem[]): items is MenuItems => items.length > 0;

export type ButtonMenuProps = {
  label: string;
  items: MenuItems;
  icon?: IconGlyph;
  item?: boolean;
};

export type ContextMenuProps = {
  context: true;
  label: string;
  items: MenuItems;
  children: ReactNode;
};

export type MenuProps = ButtonMenuProps | ContextMenuProps;

export type MenuRun = (item: MenuItem) => void;

export type MenuPoint = { x: number; y: number };
