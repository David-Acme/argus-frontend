import * as DialogPrimitive from '@rn-primitives/dialog';
import { useEffect, useEffectEvent } from 'react';
import { BackHandler, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IS_ANDROID, IS_WEB } from '@/shared/constants';
import { tokens } from '@/shared/theme/tokens';
import { DialogFooter, DiscardRow, IconButton, SheetTitle } from './sheet-parts';
import type { SheetProps } from './types';
import { useDiscard, type Discard } from './use-discard';
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
});

function useDialogKeys(props: SheetProps, discard: Discard): void {
  const submit = useEffectEvent((event: KeyboardEvent) => {
    const primary = props.actions?.primary;
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || !primary || primary.disabled)
      return;
    event.preventDefault();
    primary.onPress();
  });
  const back = useEffectEvent(() => {
    if (discard.asking) discard.keep();
    else discard.requestClose();
    return true;
  });
  useEffect(() => {
    if (!props.open) return;
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
  }, [props.open]);
}

type BottomProps = { discard: Discard; actions: SheetProps['actions']; theme: SheetTheme };

function DialogBottom({ discard, actions, theme }: BottomProps) {
  if (discard.asking) {
    return (
      <DiscardRow
        question={discard.question}
        keep={{ label: discard.keepLabel, onPress: discard.keep, testID: 'sheet-keep' }}
        discard={{ label: discard.discardLabel, onPress: discard.confirm, testID: 'sheet-discard' }}
        theme={theme}
      />
    );
  }
  if (!actions) return null;
  return (
    <DialogFooter
      primary={actions.primary}
      more={actions.more}
      theme={theme}
      hint={discard.submitHint}
    />
  );
}

export function SheetDialog(props: SheetProps) {
  const { open, onClose, title, long, dirty, actions, initialFocus, children, testID } = props;
  const theme = useSheetTheme();
  const shadow = useSheetElevation();
  const { height } = useWindowDimensions();
  const discard = useDiscard(dirty, onClose);
  const scrim = { backgroundColor: theme.scrim };
  const panel = {
    width: long ? layout.dialogLong : layout.dialog,
    maxHeight: height - EDGE * 2,
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
  useDialogKeys(props, discard);

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
              <IconButton
                label={discard.closeLabel}
                onPress={discard.requestClose}
                theme={theme}
                glyph="close"
                testID="sheet-close"
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
            <DialogBottom discard={discard} actions={actions} theme={theme} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
