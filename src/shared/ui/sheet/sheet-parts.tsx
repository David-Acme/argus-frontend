import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/shared/theme/tokens';
import type { SheetAction } from './types';
import type { SheetTheme } from './use-sheet-theme';

const { size, space, radius, type, typeRoles, layout } = tokens;
const GLYPH_BAR = 0.62;
const DOT = 4;

const styles = StyleSheet.create({
  glyph: { alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', height: size.iconStroke, borderRadius: size.iconStroke },
  dots: { flexDirection: 'row', gap: DOT - 1 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  iconButton: {
    width: size.targetMin,
    height: size.targetMin,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: { width: size.wellSmall, height: size.wellSmall },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    minHeight: size.targetMin,
  },
  title: { flex: 1 },
  primary: {
    borderRadius: radius.button,
    minHeight: size.button,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space[2],
  },
  block: { flex: 1 },
  compact: { minHeight: size.buttonCompact, borderRadius: radius.control, paddingHorizontal: 14 },
  key: {
    borderWidth: 1,
    borderBottomWidth: 2,
    borderRadius: radius.key,
    paddingHorizontal: 5,
    opacity: 0.7,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dialogFooter: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: 22 },
  push: { marginRight: 'auto' },
  discard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    paddingVertical: space[3],
    paddingLeft: space[4],
    paddingRight: space[3],
    borderRadius: radius.well,
    flexWrap: 'wrap',
  },
  label: { textAlign: 'center' },
  grow: { flex: 1, minWidth: layout.gutterCompact * 8 },
});

type Weight = '400' | '500' | '600' | '700' | '800';

function weightOf(weight: string): Weight {
  return `${Math.min(8, Math.max(4, Math.round(Number(weight) / 100))) * 100}` as Weight;
}

export function CloseGlyph({ color, extent }: { color: string; extent: number }) {
  const bar = { width: extent * GLYPH_BAR, backgroundColor: color };
  const box = { width: extent, height: extent };
  const down = { transform: [{ rotate: '45deg' }] };
  const up = { transform: [{ rotate: '-45deg' }] };
  return (
    <View style={[styles.glyph, box]}>
      <View style={[styles.bar, bar, down]} />
      <View style={[styles.bar, bar, up]} />
    </View>
  );
}

export function MoreGlyph({ color }: { color: string }) {
  const tint = { backgroundColor: color };
  return (
    <View style={styles.dots}>
      <View style={[styles.dot, tint]} />
      <View style={[styles.dot, tint]} />
      <View style={[styles.dot, tint]} />
    </View>
  );
}

type IconButtonProps = {
  label: string;
  onPress: () => void;
  theme: SheetTheme;
  small?: boolean;
  filled?: boolean;
  glyph: 'close' | 'more';
  testID?: string;
};

export function IconButton({
  label,
  onPress,
  theme,
  small,
  filled,
  glyph,
  testID,
}: IconButtonProps) {
  const extent = small ? size.iconSmall : size.icon;
  const rest = { backgroundColor: filled ? theme.fill : 'transparent' };
  const held = { backgroundColor: theme['fill-press'] };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={small ? (size.targetMin - size.wellSmall) / 2 : 0}
      testID={testID}
      style={({ pressed }) => [
        styles.iconButton,
        small && styles.smallButton,
        pressed ? held : rest,
      ]}>
      {glyph === 'close' ? (
        <CloseGlyph color={theme.text} extent={extent} />
      ) : (
        <MoreGlyph color={theme.text} />
      )}
    </Pressable>
  );
}

type TitleProps = { title: string; theme: SheetTheme; dialog: boolean; nativeID?: string };

export function SheetTitle({ title, theme, dialog, nativeID }: TitleProps) {
  const spec = dialog ? type.title : type.headline;
  const text = {
    color: theme.text,
    fontSize: spec.size,
    lineHeight: spec.line,
    fontWeight: weightOf(spec.weight),
    letterSpacing: spec.tracking * spec.size,
  };
  return (
    <Text
      role="heading"
      nativeID={nativeID}
      numberOfLines={1}
      maxFontSizeMultiplier={spec.maxScale}
      style={[styles.title, text]}>
      {title}
    </Text>
  );
}

type HeaderProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  theme: SheetTheme;
  dialog: boolean;
};

export function SheetHeader({ title, closeLabel, onClose, theme, dialog }: HeaderProps) {
  return (
    <View style={styles.header}>
      <SheetTitle title={title} theme={theme} dialog={dialog} />
      <IconButton
        label={closeLabel}
        onPress={onClose}
        theme={theme}
        small={!dialog}
        filled={!dialog}
        glyph="close"
        testID="sheet-close"
      />
    </View>
  );
}

type PrimaryProps = { action: SheetAction; theme: SheetTheme; compact?: boolean; hint?: string };

export function PrimaryButton({ action, theme, compact, hint }: PrimaryProps) {
  const role = compact ? typeRoles.buttonCompact : typeRoles.button;
  const ink = { backgroundColor: theme.ink, opacity: action.disabled ? 0.4 : 1 };
  const inkPressed = { backgroundColor: theme.ink, opacity: action.disabled ? 0.4 : 0.85 };
  const text = {
    color: theme['on-ink'],
    fontSize: role.size,
    lineHeight: role.line,
    fontWeight: weightOf(role.weight),
  };
  const keyText = {
    color: theme['on-ink'],
    borderColor: theme['on-ink'],
    fontSize: typeRoles.key.size,
    lineHeight: typeRoles.key.line,
    fontWeight: weightOf(typeRoles.key.weight),
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!action.disabled }}
      disabled={action.disabled}
      onPress={action.onPress}
      testID={action.testID}
      style={({ pressed }) => [
        styles.primary,
        compact ? styles.compact : styles.block,
        pressed ? inkPressed : ink,
      ]}>
      <Text maxFontSizeMultiplier={role.maxScale} style={[styles.label, text]}>
        {action.label}
      </Text>
      {hint ? <Text style={[styles.key, keyText]}>{hint}</Text> : null}
    </Pressable>
  );
}

type FooterProps = { primary: SheetAction; more?: SheetAction; theme: SheetTheme };

export function PhoneFooter({ primary, more, theme }: FooterProps) {
  return (
    <View style={styles.footer}>
      {more ? (
        <IconButton
          label={more.label}
          onPress={more.onPress}
          theme={theme}
          filled
          glyph="more"
          testID={more.testID}
        />
      ) : null}
      <PrimaryButton action={primary} theme={theme} />
    </View>
  );
}

export function DialogFooter({ primary, more, theme, hint }: FooterProps & { hint: string }) {
  return (
    <View style={styles.dialogFooter}>
      {more ? (
        <View style={styles.push}>
          <IconButton
            label={more.label}
            onPress={more.onPress}
            theme={theme}
            filled
            glyph="more"
            testID={more.testID}
          />
        </View>
      ) : (
        <View style={styles.push} />
      )}
      <PrimaryButton action={primary} theme={theme} compact hint={hint} />
    </View>
  );
}

type DiscardProps = {
  question: string;
  keep: SheetAction;
  discard: SheetAction;
  theme: SheetTheme;
};

export function DiscardRow({ question, keep, discard, theme }: DiscardProps) {
  const role = typeRoles.buttonCompact;
  const label = { fontSize: role.size, lineHeight: role.line, fontWeight: weightOf(role.weight) };
  const band = { backgroundColor: theme['attn-soft'] };
  const ask = { color: theme.text, fontWeight: weightOf(typeRoles.label.weight) };
  const keepText = { color: theme.text };
  const discardFill = { backgroundColor: theme['alert-soft'] };
  const discardText = { color: theme.alert };
  return (
    <View role="alertdialog" accessibilityLabel={question} style={[styles.discard, band]}>
      <Text style={[styles.grow, label, ask]}>{question}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={keep.onPress}
        testID={keep.testID}
        style={[styles.primary, styles.compact]}>
        <Text style={[label, keepText]}>{keep.label}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={discard.onPress}
        testID={discard.testID}
        style={[styles.primary, styles.compact, discardFill]}>
        <Text style={[label, discardText]}>{discard.label}</Text>
      </Pressable>
    </View>
  );
}
