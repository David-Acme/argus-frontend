import { TrueSheet, type TrueSheetMethods } from '@lodev09/react-native-true-sheet';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffects } from '@/shared/theme/effects';
import { tokens } from '@/shared/theme/tokens';
import { PhoneFooter, SheetHeader } from './sheet-parts';
import type { SheetProps } from './types';
import { useDiscard } from './use-discard';
import { useSheetTheme, withAlpha } from './use-sheet-theme';

const { space, radius, size, material } = tokens;
const CEILING_GAP = space[4];
const GRABBER_ALPHA = 0.4;

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[4], paddingTop: space[1], paddingBottom: 6 },
  tallHeader: { borderBottomWidth: size.hairline },
  body: { paddingHorizontal: space[4], paddingBottom: space[4] },
  footer: { paddingHorizontal: space[4], paddingTop: 10, paddingBottom: 10 },
  tallFooter: { borderTopWidth: size.hairline },
});

export function SheetPhone({ open, onClose, title, long, dirty, actions, initialFocus, children, testID }: SheetProps) {
  const sheet = useRef<TrueSheetMethods>(null);
  const theme = useSheetTheme();
  const { reduceTransparency } = useEffects();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [footerHeight, setFooterHeight] = useState(0);
  const dismiss = () => {
    void sheet.current?.dismiss();
  };
  const discard = useDiscard(dirty, dismiss);
  const askOrClose = () => {
    if (!dirty) return dismiss();
    Alert.alert(discard.question, discard.body, [
      { text: discard.keepLabel, style: 'cancel' },
      { text: discard.discardLabel, style: 'destructive', onPress: dismiss },
    ]);
  };

  useEffect(() => {
    if (open) void sheet.current?.present();
    else void sheet.current?.dismiss();
  }, [open]);

  const background = reduceTransparency ? theme.surface : withAlpha(theme.surface, material.sheetSurfaceMix);
  const header = (
    <View style={[styles.header, long && styles.tallHeader, { borderColor: theme.line }]}>
      <SheetHeader title={title} closeLabel={discard.closeLabel} onClose={askOrClose} theme={theme} dialog={false} />
    </View>
  );
  const footer = actions ? (
    <View
      onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
      style={[styles.footer, long && styles.tallFooter, { borderColor: theme.line, backgroundColor: theme.surface, paddingBottom: 10 + insets.bottom }]}>
      <PhoneFooter primary={actions.primary} more={actions.more} theme={theme} />
    </View>
  ) : undefined;

  return (
    <TrueSheet
      ref={sheet}
      detents={long ? [0.6, 1] : ['auto']}
      scrollable={long}
      scrollableOptions={{ keyboardScrollOffset: CEILING_GAP }}
      header={header}
      footer={footer}
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
      grabberOptions={{ width: size.grabberWidth, height: size.grabberHeight, color: withAlpha(theme['text-3'], GRABBER_ALPHA) }}
      cornerRadius={radius.sheet}
      backgroundColor={background}
      backgroundBlur={reduceTransparency ? undefined : 'system-material'}>
      {long ? (
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.body, { paddingBottom: space[4] + footerHeight }]} testID={testID}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, { paddingBottom: space[4] + footerHeight }]} testID={testID}>
          {children}
        </View>
      )}
    </TrueSheet>
  );
}
