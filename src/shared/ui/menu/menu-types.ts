import type { ComponentType, ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

export type MenuItem = {
  label: string;
  icon?: IconGlyph;
  destructive?: boolean;
  onPress: () => void;
};

export type MenuItems = readonly [MenuItem, MenuItem, ...MenuItem[]];

export type SheetSlotProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  variant: 'list';
  long?: boolean;
  children: ReactNode;
};

export type SheetSlot = ComponentType<SheetSlotProps>;

export type ButtonMenuProps = {
  label: string;
  items: MenuItems;
  icon?: IconGlyph;
  sheet: SheetSlot;
};

export type ContextMenuProps = {
  context: true;
  label: string;
  items: MenuItems;
  sheet: SheetSlot;
  children: ReactNode;
};

export type MenuProps = ButtonMenuProps | ContextMenuProps;
