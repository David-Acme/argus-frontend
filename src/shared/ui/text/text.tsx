import { clsx } from 'clsx';
import { createContext, useContext, type ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import { type as typeSteps, typeRoles, type TypeSpec, type TypeStep } from '@/shared/theme';

export type TextVariant = TypeStep | keyof typeof typeRoles;

export type TextTone = 'default' | '2' | '3' | 'ok' | 'attn' | 'alert' | 'accent' | 'on-ink';

export type TextProps = {
  variant?: TextVariant;
  tone?: TextTone;
  heading?: boolean;
  struck?: boolean;
  underline?: boolean;
  align?: 'start' | 'center';
  numberOfLines?: number;
  testID?: string;
  children: ReactNode;
};

const SPECS: Record<TextVariant, TypeSpec> = { ...typeSteps, ...typeRoles };

const VARIANT_CLASS: Record<TextVariant, string> = {
  hero: 'text-hero',
  title: 'text-title',
  headline: 'text-headline',
  body: 'text-body',
  meta: 'text-meta',
  caption: 'text-caption',
  heroCompact: 'text-hero-compact',
  heroSecondary: 'text-hero-secondary',
  section: 'text-section',
  rowTitle: 'text-row-title',
  rowMeta: 'text-row-meta',
  button: 'text-button',
  buttonCompact: 'text-button-compact',
  label: 'text-label',
  feed: 'text-feed',
  chip: 'text-chip',
  tab: 'text-tab',
  key: 'text-key',
  sectionMeta: 'text-section-meta',
  chipValue: 'text-chip-value',
  initial: 'text-initial',
  initialLarge: 'text-initial-large',
  toastTitle: 'text-toast-title',
  toastBody: 'text-toast-body',
  toastAction: 'text-toast-action',
  query: 'text-query',
  groupTitle: 'text-group-title',
  hint: 'text-hint',
};

const TONE_CLASS: Record<TextTone, string> = {
  default: 'text-text',
  '2': 'text-text-2',
  '3': 'text-text-3',
  ok: 'text-ok',
  attn: 'text-attn',
  alert: 'text-alert',
  accent: 'text-accent',
  'on-ink': 'text-on-ink',
};

const DEFAULT_TONE: Partial<Record<TextVariant, TextTone>> = {
  meta: '2',
  rowMeta: '2',
  caption: '3',
  sectionMeta: '3',
};

const TextScale = createContext(1);

export const TextScaleProvider = TextScale.Provider;

function scaledStyle(spec: TypeSpec, scale: number) {
  if (scale === 1) return undefined;
  const factor = Math.min(scale, spec.maxScale);
  return { fontSize: spec.size * factor, lineHeight: spec.line * factor };
}

export function Text({
  variant = 'body',
  tone,
  heading,
  struck,
  underline,
  align = 'start',
  numberOfLines,
  testID,
  children,
}: TextProps) {
  const scale = useContext(TextScale);
  const spec = SPECS[variant];
  const toneClass = struck
    ? 'text-text-3 line-through'
    : TONE_CLASS[tone ?? DEFAULT_TONE[variant] ?? 'default'];
  return (
    <NativeText
      role={heading ? 'heading' : undefined}
      maxFontSizeMultiplier={spec.maxScale}
      numberOfLines={numberOfLines}
      testID={testID}
      style={scaledStyle(spec, scale)}
      className={clsx(
        'web:font-system',
        VARIANT_CLASS[variant],
        toneClass,
        underline && 'underline underline-offset-3',
        align === 'center' && 'text-center'
      )}>
      {children}
    </NativeText>
  );
}
