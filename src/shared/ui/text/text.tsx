import { clsx } from 'clsx';
import { createContext, useContext, type ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import {
  illustration,
  type as typeSteps,
  typeRoles,
  type TypeSpec,
  type TypeStep,
} from '@/shared/theme';

export type TextVariant = TypeStep | keyof typeof typeRoles;

export type TextTone =
  | 'default'
  | '2'
  | '3'
  | 'ok'
  | 'attn'
  | 'alert'
  | 'accent'
  | 'on-ink'
  | 'on-media'
  | 'clear';

export type HeadingLevel = 1 | 2 | 3 | 4;

export type TextProps = {
  variant?: TextVariant;
  tone?: TextTone;
  heading?: HeadingLevel;
  struck?: boolean;
  underline?: boolean;
  align?: 'start' | 'center';
  numberOfLines?: number;
  mono?: boolean;
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
  initialPortrait: 'text-initial-portrait',
  sectionLink: 'text-section-link',
  toastTitle: 'text-toast-title',
  toastBody: 'text-toast-body',
  toastAction: 'text-toast-action',
  query: 'text-query',
  groupTitle: 'text-group-title',
  hint: 'text-hint',
  control: 'text-control',
  fieldError: 'text-field-error',
  entry: 'text-entry',
  code: 'text-code',
  noticeTitle: 'text-notice-title',
  noticeBody: 'text-notice-body',
  feedWho: 'text-feed-who',
  mediaLabel: 'text-media-label',
  mediaDetail: 'text-media-detail',
  mediaChip: 'text-media-chip',
  eyeChip: 'text-eye-chip',
  heroBand: 'text-hero-band',
  greeting: 'text-greeting',
  brand: 'text-brand',
  count: 'text-count',
  sideStat: 'text-side-stat',
  sideStatStrong: 'text-side-stat-strong',
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
  'on-media': 'text-on-media',
  clear: 'text-transparent',
};

const DEFAULT_TONE: Partial<Record<TextVariant, TextTone>> = {
  meta: '2',
  rowMeta: '2',
  caption: '3',
  sectionMeta: '3',
  noticeBody: '2',
};

const TextScale = createContext(1);

export const TextScaleProvider = TextScale.Provider;

const MEDIA_SHADOW = {
  textShadowColor: illustration.mediaTextShadow.color,
  textShadowOffset: { width: 0, height: illustration.mediaTextShadow.offsetY },
  textShadowRadius: illustration.mediaTextShadow.radius,
};

function scaledStyle(spec: TypeSpec, scale: number) {
  if (scale === 1) return undefined;
  const factor = Math.min(scale, spec.maxScale);
  return { fontSize: spec.size * factor, lineHeight: spec.line * factor };
}

export function useTypeScale(variant: TextVariant) {
  const spec = SPECS[variant];
  const factor = Math.min(useContext(TextScale), spec.maxScale);
  return { factor, style: scaledStyle(spec, factor) };
}

function withMediaShadow(
  variant: TextVariant,
  tone: TextTone | undefined,
  scaled: ReturnType<typeof scaledStyle>
) {
  if (tone !== 'on-media' || (variant !== 'mediaLabel' && variant !== 'mediaDetail')) return scaled;
  return scaled ? [scaled, MEDIA_SHADOW] : MEDIA_SHADOW;
}

export function Text({
  variant = 'body',
  tone,
  heading,
  struck,
  underline,
  align = 'start',
  numberOfLines,
  mono,
  testID,
  children,
}: TextProps) {
  const spec = SPECS[variant];
  const { style } = useTypeScale(variant);
  const toneClass = struck
    ? 'text-text-3 line-through'
    : TONE_CLASS[tone ?? DEFAULT_TONE[variant] ?? 'default'];
  return (
    <NativeText
      role={heading ? 'heading' : undefined}
      aria-level={heading}
      maxFontSizeMultiplier={spec.maxScale}
      numberOfLines={numberOfLines}
      testID={testID}
      style={withMediaShadow(variant, tone, style)}
      className={clsx(
        mono ? 'font-mono' : 'web:font-system',
        VARIANT_CLASS[variant],
        toneClass,
        underline && 'underline underline-offset-3',
        align === 'center' && 'text-center'
      )}>
      {children}
    </NativeText>
  );
}
