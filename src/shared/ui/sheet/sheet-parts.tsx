import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/shared/theme/tokens';
import { Button } from '@/shared/ui/button';
import type { SheetAction } from './types';
import type { SheetTheme } from './use-sheet-theme';

const { size, space, radius, type, typeRoles, layout } = tokens;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    minHeight: size.targetMin,
  },
  title: { flex: 1 },
  block: { flex: 1 },
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
  grow: { flex: 1, minWidth: layout.gutterCompact * 8 },
});

type Weight = '400' | '500' | '600' | '700' | '800';

function weightOf(weight: string): Weight {
  return `${Math.min(8, Math.max(4, Math.round(Number(weight) / 100))) * 100}` as Weight;
}

type TitleProps = { title: string; theme: SheetTheme; dialog: boolean; id?: string };

export function SheetTitle({ title, theme, dialog, id }: TitleProps) {
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
      nativeID={id}
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
      <CloseButton label={closeLabel} onPress={onClose} dialog={dialog} />
    </View>
  );
}

type CloseProps = { label: string; onPress: () => void; dialog: boolean };

export function CloseButton({ label, onPress, dialog }: CloseProps) {
  if (dialog) return <Button iconOnly icon="x" label={label} onPress={onPress} />;
  return <Button iconOnly compact filled icon="x" label={label} onPress={onPress} />;
}

function MoreButton({ action }: { action: SheetAction }) {
  return (
    <Button
      iconOnly
      filled
      iconSize="small"
      icon="more"
      label={action.label}
      onPress={action.onPress}
      disabled={action.disabled}
    />
  );
}

type FooterProps = { primary: SheetAction; more?: SheetAction };

export function PhoneFooter({ primary, more }: FooterProps) {
  return (
    <View style={styles.footer}>
      {more ? <MoreButton action={more} /> : null}
      <View style={styles.block}>
        <Button
          variant="primary"
          block
          label={primary.label}
          onPress={primary.onPress}
          disabled={primary.disabled}
        />
      </View>
    </View>
  );
}

export function DialogFooter({ primary, more, hint }: FooterProps & { hint: string }) {
  return (
    <View style={styles.dialogFooter}>
      <View style={styles.push}>{more ? <MoreButton action={more} /> : null}</View>
      <Button
        variant="primary"
        compact
        label={primary.label}
        onPress={primary.onPress}
        disabled={primary.disabled}
        trailing={hint ? { key: hint } : undefined}
      />
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
  const band = { backgroundColor: theme['attn-soft'] };
  const ask = {
    color: theme.text,
    fontSize: role.size,
    lineHeight: role.line,
    fontWeight: weightOf(typeRoles.label.weight),
  };
  return (
    <View role="alertdialog" accessibilityLabel={question} style={[styles.discard, band]}>
      <Text style={[styles.grow, ask]}>{question}</Text>
      <Button variant="ghost" compact label={keep.label} onPress={keep.onPress} />
      <Button variant="danger" compact label={discard.label} onPress={discard.onPress} />
    </View>
  );
}
