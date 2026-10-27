import { TrueSheet, type TrueSheetMethods } from '@lodev09/react-native-true-sheet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  PixelRatio,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_IOS } from '@/shared/constants';
import { useEffects } from '@/shared/theme/effects';
import {
  heightLayoutOf,
  sheetBodyCapOf,
  sheetCeilingOf,
  sheetChromeOf,
  sheetDetentsOf,
  sheetScrolls,
} from '@/shared/theme/height-layout';
import { tokens } from '@/shared/theme/tokens';
import { PhoneFooter, SheetHeader } from './sheet-parts';
import type { SheetActions, SheetProps } from './types';
import { useDiscard } from './use-discard';
import { useKeyboardInset } from './use-keyboard-inset';
import { useSheetTheme, withAlpha, type SheetTheme } from './use-sheet-theme';

const { space, radius, size, material, inset } = tokens;
const FOCUS_GAP = space[4];
const FIELD_TAIL = inset.field.top + inset.field.border;
const GRABBER_ALPHA = 0.4;
const FOOTER_PAD = 10;

const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  header: { paddingHorizontal: space[4], paddingTop: space[6], paddingBottom: 6 },
  tallHeader: { borderBottomWidth: size.hairline },
  body: { paddingHorizontal: space[4] },
  footer: { paddingHorizontal: space[4], paddingTop: FOOTER_PAD },
  tallFooter: { borderTopWidth: size.hairline },
  inlineFooter: { paddingTop: space[6] },
});

type HeaderSlotProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  long: boolean;
  theme: SheetTheme;
  onHeight: (height: number) => void;
};

type FooterSlotProps = {
  actions: SheetActions;
  long: boolean;
  theme: SheetTheme;
  bottom: number;
  onHeight: (height: number) => void;
};

function HeaderSlot({ title, closeLabel, onClose, long, theme, onHeight }: HeaderSlotProps) {
  const line = { borderColor: theme.line };
  return (
    <GestureHandlerRootView style={styles.root}>
      <View
        onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
        style={[styles.header, long && styles.tallHeader, line]}>
        <SheetHeader
          title={title}
          closeLabel={closeLabel}
          onClose={onClose}
          theme={theme}
          dialog={false}
        />
      </View>
    </GestureHandlerRootView>
  );
}

function FooterSlot({ actions, long, theme, bottom, onHeight }: FooterSlotProps) {
  const edge = { borderColor: theme.line, backgroundColor: theme.surface };
  const pad = { paddingBottom: FOOTER_PAD + bottom };
  return (
    <GestureHandlerRootView style={styles.root}>
      <View
        onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
        style={[styles.footer, long && styles.tallFooter, edge, pad]}>
        <PhoneFooter primary={actions.primary} more={actions.more} />
      </View>
    </GestureHandlerRootView>
  );
}

export function focusScrollOffset(footerHeight: number): number {
  return FOCUS_GAP + FIELD_TAIL + footerHeight + 1 / PixelRatio.get();
}

type BodyProps = {
  long: boolean;
  clearance: number;
  cap: number;
  keyboard: number;
  testID?: string;
  children: ReactNode;
};

function useFocusRestore(keyboard: number) {
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const shown = useRef(keyboard > 0);
  useEffect(() => {
    const hid = shown.current && keyboard === 0;
    shown.current = keyboard > 0;
    const focused = TextInput.State.currentlyFocusedInput();
    if (!hid || !focused || !content.current) return;
    focused.measureLayout(content.current, (_x, y) =>
      scroll.current?.scrollTo({ y: Math.max(0, y - FOCUS_GAP), animated: true })
    );
  }, [keyboard]);
  return { scroll, content };
}

function Body({ long, clearance, cap, keyboard, testID, children }: BodyProps) {
  const { scroll, content } = useFocusRestore(keyboard);
  const padding = [styles.body, { paddingBottom: clearance }];
  const capped = long ? undefined : { maxHeight: cap };
  return (
    <GestureHandlerRootView style={styles.root}>
      <ScrollView
        ref={scroll}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={capped}
        contentContainerStyle={padding}
        testID={testID}>
        <View ref={content}>{children}</View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

function useSheetPresence(open: boolean, dirty: SheetProps['dirty']) {
  const sheet = useRef<TrueSheetMethods>(null);
  const dismiss = () => {
    void sheet.current?.dismiss();
  };
  const discard = useDiscard(dirty, dismiss);
  const askOrClose = () => {
    if (!dirty) return dismiss();
    Alert.alert(
      discard.question,
      discard.body,
      [
        { text: discard.keepLabel, style: 'cancel' },
        { text: discard.discardLabel, style: 'destructive', onPress: dismiss },
      ],
      { cancelable: true }
    );
  };
  useEffect(() => {
    if (open) void sheet.current?.present();
    else void sheet.current?.dismiss();
  }, [open]);
  return { sheet, closeLabel: discard.closeLabel, askOrClose };
}

function grabberOf(theme: SheetTheme) {
  return {
    width: size.grabberWidth,
    height: size.grabberHeight,
    color: withAlpha(theme['text-3'], GRABBER_ALPHA),
  };
}

function useSheetRoom(form: boolean) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [footerHeight, setFooterHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const room = { height, top: insets.top, header: headerHeight, keyboard: useKeyboardInset() };
  const chrome = sheetChromeOf({ ...room, footer: form ? footerHeight : 0 });
  const pinned = form && chrome.footerPinned;
  return { room, chrome, pinned, footerHeight, setFooterHeight, setHeaderHeight };
}

export function SheetPhone(props: SheetProps) {
  const { open, onClose, title, long = false, dirty, actions, initialFocus, children } = props;
  const { sheet, closeLabel, askOrClose } = useSheetPresence(open, dirty);
  const theme = useSheetTheme();
  const { reduceTransparency } = useEffects();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { room, chrome, pinned, footerHeight, setFooterHeight, setHeaderHeight } = useSheetRoom(
    actions !== undefined
  );
  const detents = sheetDetentsOf(
    { long, form: actions !== undefined },
    heightLayoutOf({ width, height })
  );
  const scrolls = sheetScrolls(detents);
  const clearance = pinned ? Math.max(0, footerHeight - insets.bottom) : space[4];
  const blurred = IS_IOS && !reduceTransparency;
  const surface = blurred ? withAlpha(theme.surface, material.sheetSurfaceMix) : theme.surface;

  return (
    <TrueSheet
      ref={sheet}
      detents={[...detents]}
      scrollable={scrolls}
      scrollableOptions={{ keyboardScrollOffset: focusScrollOffset(pinned ? footerHeight : 0) }}
      header={
        chrome.header ? (
          <HeaderSlot
            title={title}
            closeLabel={closeLabel}
            onClose={askOrClose}
            long={scrolls}
            theme={theme}
            onHeight={setHeaderHeight}
          />
        ) : undefined
      }
      footer={
        actions && pinned ? (
          <FooterSlot
            actions={actions}
            long={scrolls}
            theme={theme}
            bottom={insets.bottom}
            onHeight={setFooterHeight}
          />
        ) : undefined
      }
      footerOptions={{ keyboardOffset: -insets.bottom }}
      maxContentHeight={sheetCeilingOf(room)}
      insetAdjustment="automatic"
      dismissible={!dirty}
      onBackPress={() => {
        askOrClose();
        return true;
      }}
      onDidPresent={() => initialFocus?.current?.focus()}
      onDidDismiss={onClose}
      grabber
      grabberOptions={grabberOf(theme)}
      cornerRadius={radius.sheet}
      backgroundColor={surface}
      backgroundBlur={blurred ? 'system-material' : undefined}>
      <Body
        long={scrolls}
        clearance={clearance}
        cap={sheetBodyCapOf(room)}
        keyboard={room.keyboard}
        testID={props.testID}>
        {children}
        {actions && !pinned ? (
          <View style={styles.inlineFooter}>
            <PhoneFooter primary={actions.primary} more={actions.more} />
          </View>
        ) : null}
      </Body>
    </TrueSheet>
  );
}
