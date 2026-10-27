import * as ContextPrimitive from '@rn-primitives/context-menu';
import * as DropdownPrimitive from '@rn-primitives/dropdown-menu';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { space } from '@/shared/theme';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { opensContextMenu } from './menu-keys';
import { menuGroups } from './menu-model';
import { MENU_DIVIDER, MENU_ROW, MenuRowContent, useMenuPanel, type MenuRowLook } from './menu-row';
import type { MenuItem, MenuRun } from './menu-types';

export type AnchoredButtonProps = {
  label: string;
  icon: IconGlyph;
  items: readonly MenuItem[];
  look: MenuRowLook;
  onRun: MenuRun;
};

export type AnchoredContextProps = {
  label: string;
  items: readonly MenuItem[];
  onRun: MenuRun;
  children: ReactNode;
};

type ItemsProps = { items: readonly MenuItem[]; onRun: MenuRun };

type DropdownItemsProps = ItemsProps & { look: MenuRowLook };

type MenuKeyEvent = {
  key: string;
  shiftKey: boolean;
  currentTarget: HTMLElement;
  preventDefault: () => void;
};

const OFFSET = space[1];

function DropdownItems({ items, look, onRun }: DropdownItemsProps) {
  const { actions, dangers } = menuGroups(items);
  const row = (item: MenuItem) => (
    <DropdownPrimitive.Item key={item.label} onPress={() => onRun(item)} className={MENU_ROW[look]}>
      <MenuRowContent item={item} look={look} />
    </DropdownPrimitive.Item>
  );
  return (
    <>
      {actions.map(row)}
      {actions.length > 0 && dangers.length > 0 ? (
        <DropdownPrimitive.Separator className={MENU_DIVIDER[look]} />
      ) : null}
      {dangers.map(row)}
    </>
  );
}

function ContextItems({ items, onRun }: ItemsProps) {
  const { actions, dangers } = menuGroups(items);
  const row = (item: MenuItem) => (
    <ContextPrimitive.Item
      key={item.label}
      role="menuitem"
      onPress={() => onRun(item)}
      className={MENU_ROW.anchored}>
      <MenuRowContent item={item} look="anchored" />
    </ContextPrimitive.Item>
  );
  return (
    <>
      {actions.map(row)}
      {actions.length > 0 && dangers.length > 0 ? (
        <ContextPrimitive.Separator className={MENU_DIVIDER.anchored} />
      ) : null}
      {dangers.map(row)}
    </>
  );
}

export function AnchoredButton({ label, icon, items, look, onRun }: AnchoredButtonProps) {
  const panel = useMenuPanel();
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger
        role="button"
        aria-label={label}
        className="size-target-min web:focus-ring web:hover:bg-fill items-center justify-center rounded-full">
        <Icon name={icon} />
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align="end"
          sideOffset={OFFSET}
          insets={{ top: space[2], bottom: space[2], left: space[2], right: space[2] }}
          aria-label={label}
          style={panel.style}
          className={panel.className}>
          <DropdownItems items={items} look={look} onRun={onRun} />
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

function openFromKeys(event: MenuKeyEvent): void {
  if (!opensContextMenu(event)) return;
  event.preventDefault();
  const { left, bottom } = event.currentTarget.getBoundingClientRect();
  event.currentTarget.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: left,
      clientY: bottom,
    })
  );
}

const KEYS = { onKeyDown: openFromKeys };

export function AnchoredContext({ label, items, onRun, children }: AnchoredContextProps) {
  const panel = useMenuPanel();
  return (
    <ContextPrimitive.Root>
      <ContextPrimitive.Trigger asChild>
        <View {...KEYS}>{children}</View>
      </ContextPrimitive.Trigger>
      <ContextPrimitive.Portal>
        <ContextPrimitive.Content
          aria-label={label}
          style={panel.style}
          className={panel.className}>
          <ContextItems items={items} onRun={onRun} />
        </ContextPrimitive.Content>
      </ContextPrimitive.Portal>
    </ContextPrimitive.Root>
  );
}
