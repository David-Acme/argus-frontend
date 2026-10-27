import type { ReactNode } from 'react';
import { View } from 'react-native';
import { opensContextMenu } from './menu-keys';
import type { MenuPoint } from './menu-types';

export type MenuHoldProps = { onOpen: (point: MenuPoint) => void; children: ReactNode };

type PointerEvent = { clientX: number; clientY: number; preventDefault: () => void };

type KeyEvent = {
  key: string;
  shiftKey: boolean;
  currentTarget: HTMLElement;
  preventDefault: () => void;
};

export function MenuHold({ onOpen, children }: MenuHoldProps) {
  const handlers = {
    onContextMenu: (event: PointerEvent) => {
      event.preventDefault();
      onOpen({ x: event.clientX, y: event.clientY });
    },
    onKeyDown: (event: KeyEvent) => {
      if (!opensContextMenu(event)) return;
      event.preventDefault();
      const { left, bottom } = event.currentTarget.getBoundingClientRect();
      onOpen({ x: left, y: bottom });
    },
  };
  return <View {...handlers}>{children}</View>;
}
