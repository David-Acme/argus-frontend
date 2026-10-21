import type { ReactNode } from 'react';
import type { ChipTone } from '@/shared/ui/chip';
import type { IconGlyph } from '@/shared/ui/icon';
import type { PresenceState } from '@/shared/ui/presence';

export type StatusTone = 'calm' | 'attention' | 'alert';

export type StatusStat = { value: string; label: string; icon?: IconGlyph; tone?: ChipTone };

export type StatusAction = { label: string; onPress: () => void | Promise<unknown> };

export type HeroStatusProps = {
  variant?: 'hero';
  tone: StatusTone;
  sentence: string;
  meta: string;
  stats?: readonly StatusStat[];
  presence?: PresenceState;
  secondary?: boolean;
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
