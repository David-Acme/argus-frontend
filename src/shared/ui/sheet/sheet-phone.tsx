import { TrueSheet, type TrueSheetMethods } from '@lodev09/react-native-true-sheet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffects } from '@/shared/theme/effects';
import { tokens } from '@/shared/theme/tokens';
import { PhoneFooter, SheetHeader } from './sheet-parts';
import type { SheetActions, SheetProps } from './types';
import { useDiscard } from './use-discard';
import { useSheetTheme, withAlpha, type SheetTheme } from './use-sheet-theme';

const { space, radius, size, material } = tokens;
const CEILING_GAP = space[4];
const GRABBER_ALPHA = 0.4;
const FOOTER_PAD = 10;

const styles = StyleSheet.create({
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
  inset: number;
  onHeight: (height: number) => void;
};

function FooterSlot({ actions, long, theme, inset, onHeight }: FooterSlotProps) {
  return (
    <View
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      style={[
        styles.footer,
        long && styles.tallFooter,
        { borderColor: theme.line, backgroundColor: theme.surface },
        { paddingBottom: FOOTER_PAD + inset },
      ]}>
      <PhoneFooter primary={actions.primary} more={actions.more} theme={theme} />
    </View>
  );
}

type BodyProps = { long: boolean; clearance: number; testID?: string; children: ReactNode };

function Body({ long, clearance, testID, children }: BodyProps) {
  const padding = [styles.body, { paddingBottom: clearance }];
  if (!long) {
    return (
      <View style={padding} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={padding}
      testID={testID}>
      {children}
    </ScrollView>
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
  const clearance = actions ? Math.max(0, footerHeight - insets.bottom) : space[4];
  const surface = reduceTransparency
    ? theme.surface
    : withAlpha(theme.surface, material.sheetSurfaceMix);
  const grabber = {
    width: size.grabberWidth,
    height: size.grabberHeight,
    color: withAlpha(theme['text-3'], GRABBER_ALPHA),
  };

  return (
    <TrueSheet
      ref={sheet}
      detents={long ? [0.6, 1] : ['auto']}
      scrollable={long}
      scrollableOptions={{ keyboardScrollOffset: CEILING_GAP + footerHeight }}
      header={
        <View style={[styles.header, long && styles.tallHeader, { borderColor: theme.line }]}>
          <SheetHeader
            title={title}
            closeLabel={closeLabel}
            onClose={askOrClose}
            theme={theme}
            dialog={false}
          />
        </View>
      }
      footer={
        actions ? (
          <FooterSlot
            actions={actions}
            long={long}
            theme={theme}
            inset={insets.bottom}
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
      backgroundBlur={reduceTransparency ? undefined : 'system-material'}>
      <Body long={long} clearance={clearance} testID={props.testID}>
        {children}
      </Body>
    </TrueSheet>
  );
}
