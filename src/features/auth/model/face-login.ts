import type { TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';
import type { FaceProgress } from '@/features/auth/model/face-progress';

export type FaceLoginInput = { restoring: boolean; failed: boolean; progress: FaceProgress };

export type FaceLoginCopy = {
  title: TranslationKey;
  lead: TranslationKey;
  chip: TranslationKey;
  chipTone: 'default' | 'ok' | 'attn';
  chipIcon?: IconGlyph;
};

const CHIP_TONE = { calm: 'default', ok: 'ok', attn: 'attn' } as const;

const CHIP_ICON: Readonly<Record<FaceLoginCopy['chipTone'], IconGlyph | undefined>> = {
  default: undefined,
  ok: 'check',
  attn: 'alert',
};

export function faceLoginCopyOf({ restoring, failed, progress }: FaceLoginInput): FaceLoginCopy {
  const recognising = progress.progress > 0;
  const chip = recognising ? 'screens.face.login.recognising' : progress.cue;
  const chipTone = failed ? 'attn' : CHIP_TONE[progress.tone];
  const chipIcon = CHIP_ICON[chipTone];
  if (failed)
    return {
      title: 'screens.face.login.failed-title',
      lead: 'screens.face.login.failed-lead',
      chip: progress.cue,
      chipTone,
      chipIcon,
    };
  if (restoring)
    return {
      title: 'screens.face.login.restore-title',
      lead: 'screens.face.login.restore-lead',
      chip,
      chipTone,
      chipIcon,
    };
  return {
    title: 'screens.face.login.title',
    lead: 'screens.face.login.lead',
    chip,
    chipTone,
    chipIcon,
  };
}
