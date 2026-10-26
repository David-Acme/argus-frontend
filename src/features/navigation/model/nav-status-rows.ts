import type { GuardMode, TranslationKey } from '@/core/types';
import type { CameraCounts } from '@/features/cameras';
import type { IconGlyph } from '@/shared/ui/icon';
import type { NavStatusRow } from '@/shared/ui/nav';

export type NavStatusCopy = {
  mode: string;
  modeName: (mode: GuardMode) => string;
  cameras: (counts: CameraCounts) => string;
  camerasActive: string;
};

export type NavStatusInput = {
  mode: GuardMode | null;
  cameras: CameraCounts | null;
  copy: NavStatusCopy;
};

export const MODE_NAME_KEYS: Readonly<Record<GuardMode, TranslationKey>> = {
  home: 'screens.security.mode.home',
  away: 'screens.security.mode.away',
  night: 'screens.security.mode.night',
  armed: 'screens.security.mode.armed',
};

const MODE_ICONS: Readonly<Record<GuardMode, IconGlyph>> = {
  home: 'home',
  away: 'door',
  night: 'moon',
  armed: 'shield',
};

export function navStatusRows({ mode, cameras, copy }: NavStatusInput): NavStatusRow[] {
  const rows: NavStatusRow[] = [];
  if (mode) rows.push({ icon: MODE_ICONS[mode], before: copy.mode, strong: copy.modeName(mode) });
  if (cameras && cameras.total > 0)
    rows.push({ icon: 'cam', strong: copy.cameras(cameras), after: copy.camerasActive });
  return rows;
}
