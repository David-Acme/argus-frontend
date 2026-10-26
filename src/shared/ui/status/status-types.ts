import type { ReactNode } from 'react';
import type { AuraTone } from '@/shared/theme';
import type { ChipTone } from '@/shared/ui/chip';
import type { IconGlyph } from '@/shared/ui/icon';
import type { PresenceCue, PresenceState } from '@/shared/ui/presence';

export type StatusTone = 'calm' | 'attention' | 'alert';

export type StatusStat = {
  value: string;
  label: string;
  icon?: IconGlyph;
  tone?: ChipTone;
  onPress?: () => void;
};

export type StatusAction = { label: string; onPress: () => void | Promise<unknown> };

export type HeroScale = 'dense' | 'secondary';

export type HeroStatusProps = {
  variant?: 'hero';
  tone: StatusTone;
  sentence: string;
  meta: string;
  stats?: readonly StatusStat[];
  presence?: PresenceState;
  presenceEvent?: PresenceCue;
  aura?: AuraTone;
  scale?: HeroScale;
  action?: ReactNode;
};

export type CardStatusProps = {
  variant: 'card';
  tone: StatusTone;
  sentence?: string;
  meta?: string;
  media?: ReactNode;
  primary: StatusAction;
  secondaryAction?: StatusAction;
  tertiary?: StatusAction;
};

export type StatusProps = HeroStatusProps | CardStatusProps;
