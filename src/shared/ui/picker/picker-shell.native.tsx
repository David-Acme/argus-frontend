import { Portal } from '@rn-primitives/portal';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { space, useThemeTokens } from '@/shared/theme';
import { placeMenu, type MenuRect } from '@/shared/ui/menu';
import { PressableSurface } from '@/shared/ui/pressable';
import { PickerInline, type PickerShellProps } from './picker-inline';
import { PICKER_ROW, PickerRowContent } from './picker-row';
import { usePickerForm } from './use-picker-form';

type Box = { width: number; height: number };

const EDGE = space[2];

const styles = StyleSheet.create({ panel: { position: 'absolute' }, hidden: { opacity: 0 } });

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

function PickerPopover({ label, value, empty, testID, children }: PickerShellProps) {
  const name = useId();
  const row = useRef<View>(null);
  const window = useWindowDimensions();
  const { elevation } = useThemeTokens();
  const [anchor, setAnchor] = useState<MenuRect | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const close = () => setAnchor(null);
  useBackCloses(anchor !== null, close);
  const open = () =>
    row.current?.measureInWindow((...rect: [number, number, number, number]) => {
      const [x, y, width, height] = rect;
      setAnchor({ x, y, width, height });
    });
  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox({ width, height });
  };
  const place = anchor && box ? placeMenu({ anchor, panel: box, window, edge: EDGE }) : null;
  const panel = { boxShadow: `${elevation.float}, ${elevation.ring}` };
  return (
    <>
      <View ref={row} collapsable={false}>
        <PressableSurface
          a11y={{ label: `${label}, ${value}`, role: 'button', expanded: anchor !== null }}
          onPress={open}
          testID={testID}
          className={PICKER_ROW}>
          <PickerRowContent label={label} value={value} open={anchor !== null} empty={empty} />
        </PressableSurface>
      </View>
      {anchor ? (
        <Portal name={name}>
          <Pressable accessibilityLabel={label} onPress={close} style={StyleSheet.absoluteFill} />
          <View
            onLayout={measure}
            style={[panel, styles.panel, place ?? styles.hidden]}
            className="rounded-dialog bg-surface p-palette-group">
            {children(close, true)}
          </View>
        </Portal>
      ) : null}
    </>
  );
}

export function PickerShell(props: PickerShellProps) {
  const form = usePickerForm();
  if (form === 'inline') return <PickerInline {...props} />;
  return <PickerPopover {...props} />;
}
