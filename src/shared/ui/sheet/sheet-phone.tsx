import { TrueSheet, type TrueSheetMethods } from '@lodev09/react-native-true-sheet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, PixelRatio, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_IOS } from '@/shared/constants';
import { useEffects } from '@/shared/theme/effects';
import { tokens } from '@/shared/theme/tokens';
import { PhoneFooter, SheetHeader } from './sheet-parts';
import { sheetFit } from './sheet-fit';
import type { SheetActions, SheetProps } from './types';
import { useDiscard } from './use-discard';
import { useSheetTheme, withAlpha, type SheetTheme } from './use-sheet-theme';

const { space, radius, size, material, inset } = tokens;
const CEILING_GAP = space[4];
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
});

type FooterSlotProps = {
  actions: SheetActions;
  long: boolean;
  theme: SheetTheme;
  bottom: number;
  onHeight: (height: number) => void;
};

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

type BodyProps = { long: boolean; clearance: number; testID?: string; children: ReactNode };

function Body({ long, clearance, testID, children }: BodyProps) {
  const padding = [styles.body, { paddingBottom: clearance }];
  return (
    <GestureHandlerRootView style={styles.root}>
      {long ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={padding}
          testID={testID}>
          {children}
        </ScrollView>
      ) : (
        <View style={padding} testID={testID}>
          {children}
        </View>
      )}
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

export function SheetPhone(props: SheetProps) {
  const { open, onClose, title, long = false, dirty, actions, initialFocus, children } = props;
  const { sheet, closeLabel, askOrClose } = useSheetPresence(open, dirty);
  const theme = useSheetTheme();
  const { reduceTransparency } = useEffects();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [footerHeight, setFooterHeight] = useState(0);
  const fit = sheetFit(long, height);
  const clearance = actions ? Math.max(0, footerHeight - insets.bottom) : space[4];
  const blurred = IS_IOS && !reduceTransparency;
  const surface = blurred ? withAlpha(theme.surface, material.sheetSurfaceMix) : theme.surface;
  const grabber = {
    width: size.grabberWidth,
    height: size.grabberHeight,
    color: withAlpha(theme['text-3'], GRABBER_ALPHA),
  };
  const headerLine = { borderColor: theme.line };

  return (
    <TrueSheet
      ref={sheet}
      detents={fit.detents}
      scrollable={fit.scrolls}
      scrollableOptions={{ keyboardScrollOffset: focusScrollOffset(footerHeight) }}
      header={
        <GestureHandlerRootView style={styles.root}>
          <View style={[styles.header, fit.scrolls && styles.tallHeader, headerLine]}>
            <SheetHeader
              title={title}
              closeLabel={closeLabel}
              onClose={askOrClose}
              theme={theme}
              dialog={false}
            />
          </View>
        </GestureHandlerRootView>
      }
      footer={
        actions ? (
          <FooterSlot
            actions={actions}
            long={fit.scrolls}
            theme={theme}
            bottom={insets.bottom}
            onHeight={setFooterHeight}
          />
        ) : undefined
      }
      footerOptions={{ keyboardOffset: -insets.bottom }}
      maxContentHeight={height - insets.top - CEILING_GAP}
      insetAdjustment="automatic"
      dismissible={!dirty}
      onBackPress={() => {
        askOrClose();
        return true;
      }}
      onDidPresent={() => initialFocus?.current?.focus()}
      onDidDismiss={onClose}
      grabber
      grabberOptions={grabber}
      cornerRadius={radius.sheet}
      backgroundColor={surface}
      backgroundBlur={blurred ? 'system-material' : undefined}>
      <Body long={fit.scrolls} clearance={clearance} testID={props.testID}>
        {children}
      </Body>
    </TrueSheet>
  );
}
