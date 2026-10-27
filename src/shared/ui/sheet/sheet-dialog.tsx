import * as DialogPrimitive from '@rn-primitives/dialog';
import { useEffect, useEffectEvent } from 'react';
import { BackHandler, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IS_ANDROID, IS_WEB } from '@/shared/constants';
import { tokens } from '@/shared/theme/tokens';
import { CloseButton, DialogFooter, DiscardRow, SheetTitle } from './sheet-parts';
import { useSingleFlight } from '@/shared/ui/button/use-single-flight';
import type { SheetAction, SheetActions, SheetProps } from './types';
import { useDiscard, type Discard } from './use-discard';
import { useKeyboardInset } from './use-keyboard-inset';
import { useSheetElevation, useSheetTheme, type SheetTheme } from './use-sheet-theme';

const { layout, radius, space } = tokens;
const EDGE = space[6];

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: EDGE,
  },
  content: {
    maxWidth: '100%',
    borderRadius: radius.dialog,
    paddingTop: 20,
    paddingHorizontal: EDGE,
    paddingBottom: 22,
  },
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
});

const idle = () => undefined;

function useFlightActions(actions: SheetActions | undefined): SheetActions | undefined {
  const primary = actions?.primary;
  const flight = useSingleFlight(primary?.onPress ?? idle, primary?.busy ?? false);
  if (!actions || !primary) return actions;
  return { ...actions, primary: { ...primary, onPress: flight.run, busy: flight.busy } };
}

function submits(event: KeyboardEvent, primary: SheetAction | undefined): primary is SheetAction {
  if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return false;
  return !!primary && !primary.disabled && !primary.busy;
}

type DialogKeys = { open: boolean; primary: SheetAction | undefined; discard: Discard };

function useDialogKeys({ open, primary, discard }: DialogKeys): void {
  const submit = useEffectEvent((event: KeyboardEvent) => {
    if (discard.asking || !submits(event, primary)) return;
    event.preventDefault();
    void primary.onPress();
  });
  const back = useEffectEvent(() => {
    if (discard.asking) discard.keep();
    else discard.requestClose();
    return true;
  });
  useEffect(() => {
    if (!open) return;
    if (IS_WEB) {
      const opener = globalThis.document.activeElement;
      globalThis.addEventListener('keydown', submit, true);
      return () => {
        globalThis.removeEventListener('keydown', submit, true);
        if (opener instanceof HTMLElement) globalThis.setTimeout(() => opener.focus(), 0);
      };
    }
    if (!IS_ANDROID) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    return () => subscription.remove();
  }, [open]);
}

type BottomProps = { discard: Discard; actions: SheetProps['actions']; theme: SheetTheme };

function DialogBottom({ discard, actions, theme }: BottomProps) {
  if (discard.asking) {
    return (
      <DiscardRow
        question={discard.question}
        keep={{ label: discard.keepLabel, onPress: discard.keep }}
        discard={{ label: discard.discardLabel, onPress: discard.confirm }}
        theme={theme}
      />
    );
  }
  if (!actions) return null;
  return <DialogFooter primary={actions.primary} more={actions.more} hint={discard.submitHint} />;
}

export function SheetDialog(props: SheetProps) {
  const { open, onClose, title, long, dirty, initialFocus, children, testID } = props;
  const fill = long === 'fill';
  const actions = useFlightActions(props.actions);
  const theme = useSheetTheme();
  const shadow = useSheetElevation();
  const { width, height } = useWindowDimensions();
  const keyboard = useKeyboardInset();
  const discard = useDiscard(dirty, onClose);
  const scrim = { backgroundColor: theme.scrim, paddingBottom: EDGE + keyboard };
  const room = height - EDGE * 2 - keyboard;
  const panel = {
    width: Math.min(long ? layout.dialogLong : layout.dialog, width - EDGE * 2),
    maxHeight: room,
    height: fill ? room : undefined,
    backgroundColor: theme.surface,
    boxShadow: shadow,
  };
  const escape = (event: Event) => {
    event.preventDefault();
    if (discard.asking) discard.keep();
    else discard.requestClose();
  };
  const outside = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    discard.requestClose();
  };
  useDialogKeys({ open, primary: actions?.primary, discard });

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => (next ? undefined : discard.requestClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          closeOnPress={false}
          style={StyleSheet.flatten([styles.overlay, scrim])}
          onPress={IS_WEB ? undefined : discard.requestClose}>
          <DialogPrimitive.Content
            testID={testID}
            onEscapeKeyDown={escape}
            onInteractOutside={outside}
            onOpenAutoFocus={(event: Event) => {
              if (!initialFocus?.current) return;
              event.preventDefault();
              initialFocus.current.focus();
            }}
            style={StyleSheet.flatten([styles.content, panel])}>
            <View style={styles.header}>
              <DialogPrimitive.Title asChild>
                <SheetTitle title={title} theme={theme} dialog />
              </DialogPrimitive.Title>
              <CloseButton label={discard.closeLabel} onPress={discard.requestClose} dialog />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={fill ? styles.fill : undefined}
              contentContainerStyle={fill ? styles.grow : undefined}>
              {children}
            </ScrollView>
            <DialogBottom discard={discard} actions={actions} theme={theme} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
