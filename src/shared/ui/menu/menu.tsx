import * as ContextPrimitive from '@rn-primitives/context-menu';
import * as DropdownPrimitive from '@rn-primitives/dropdown-menu';
import { View } from 'react-native';
import { space } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { opensContextMenu } from './menu-keys';
import { MENU_ROW, MenuRowContent, useMenuPanel } from './menu-row';
import type { ButtonMenuProps, ContextMenuProps, MenuItems, MenuProps } from './menu-types';

type ItemsProps = { items: MenuItems };

type MenuKeyEvent = {
  key: string;
  shiftKey: boolean;
  currentTarget: HTMLElement;
  preventDefault: () => void;
};

const OFFSET = space[1];

function DropdownItems({ items }: ItemsProps) {
  return items.map((item) => (
    <DropdownPrimitive.Item key={item.label} onPress={item.onPress} className={MENU_ROW}>
      <MenuRowContent item={item} />
    </DropdownPrimitive.Item>
  ));
}

function ContextItems({ items }: ItemsProps) {
  return items.map((item) => (
    <ContextPrimitive.Item
      key={item.label}
      role="menuitem"
      onPress={item.onPress}
      className={MENU_ROW}>
      <MenuRowContent item={item} />
    </ContextPrimitive.Item>
  ));
}

function DropdownMenu({ label, items, icon = 'more' }: ButtonMenuProps) {
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
          style={panel.style}
          className={panel.className}>
          <DropdownItems items={items} />
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

function ContextMenu({ items, children }: ContextMenuProps) {
  const panel = useMenuPanel();
  return (
    <ContextPrimitive.Root>
      <ContextPrimitive.Trigger asChild>
        <View {...KEYS}>{children}</View>
      </ContextPrimitive.Trigger>
      <ContextPrimitive.Portal>
        <ContextPrimitive.Content style={panel.style} className={panel.className}>
          <ContextItems items={items} />
        </ContextPrimitive.Content>
      </ContextPrimitive.Portal>
    </ContextPrimitive.Root>
  );
}

export function Menu(props: MenuProps) {
  if ('context' in props) return <ContextMenu {...props} />;
  return <DropdownMenu {...props} />;
}
