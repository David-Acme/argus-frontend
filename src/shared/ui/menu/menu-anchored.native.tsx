import { Portal } from '@rn-primitives/portal';
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import type { IconGlyph } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { MenuHold } from './menu-hold';
import { menuGroups, placeMenu, type MenuBox, type MenuRect } from './menu-model';
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

type PopoverProps = {
  anchor: MenuRect | null;
  look: MenuRowLook;
  label: string;
  items: readonly MenuItem[];
  onClose: () => void;
  onRun: MenuRun;
};

const EDGE = space[2];

const styles = StyleSheet.create({
  panel: { position: 'absolute' },
  hidden: { opacity: 0 },
});

function useBackCloses(open: boolean, onClose: () => void): void {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [open]);
}

function MenuPopover({ anchor, look, label, items, onClose, onRun }: PopoverProps) {
  const name = useId();
  const panel = useMenuPanel();
  const window = useWindowDimensions();
  const [box, setBox] = useState<MenuBox | null>(null);
  const { actions, dangers } = menuGroups(items);
  useBackCloses(anchor !== null, onClose);
  if (!anchor) return null;
  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox({ width, height });
  };
  const place = box
    ? placeMenu({ anchor, panel: box, window, edge: EDGE })
    : { left: anchor.x, top: anchor.y };
  const pick = (item: MenuItem) => {
    onClose();
    onRun(item);
  };
  const row = (item: MenuItem) => (
    <PressableSurface
      key={item.label}
      a11y={{ label: item.label, role: 'menuitem' }}
      onPress={() => pick(item)}
      pressed={{ fill: true }}
      className={MENU_ROW[look]}>
      <MenuRowContent item={item} look={look} />
    </PressableSurface>
  );
  return (
    <Portal name={name}>
      <Pressable accessibilityLabel={label} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View
        role="menu"
        aria-label={label}
        onLayout={measure}
        style={[panel.style, styles.panel, place, box ? null : styles.hidden]}
        className={panel.className}>
        {actions.map(row)}
        {actions.length > 0 && dangers.length > 0 ? (
          <View role="separator" className={MENU_DIVIDER[look]} />
        ) : null}
        {dangers.map(row)}
      </View>
    </Portal>
  );
}

export function AnchoredButton({ label, icon, items, look, onRun }: AnchoredButtonProps) {
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<MenuRect | null>(null);
  const open = () =>
    trigger.current?.measureInWindow((...rect: [number, number, number, number]) => {
      const [x, y, width, height] = rect;
      setAnchor({ x, y, width, height });
    });
  return (
    <>
      <View ref={trigger} collapsable={false}>
        <Button iconOnly icon={icon} label={label} onPress={open} />
      </View>
      <MenuPopover
        anchor={anchor}
        look={look}
        label={label}
        items={items}
        onClose={() => setAnchor(null)}
        onRun={onRun}
      />
    </>
  );
}

export function AnchoredContext({ label, items, onRun, children }: AnchoredContextProps) {
  const [anchor, setAnchor] = useState<MenuRect | null>(null);
  return (
    <>
      <MenuHold onOpen={({ x, y }) => setAnchor({ x, y, width: 0, height: 0 })}>
        {children}
      </MenuHold>
      <MenuPopover
        anchor={anchor}
        look="anchored"
        label={label}
        items={items}
        onClose={() => setAnchor(null)}
        onRun={onRun}
      />
    </>
  );
}
