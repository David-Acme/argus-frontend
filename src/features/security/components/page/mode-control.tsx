import type { GuardMode } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice, type ChoiceOption } from '@/shared/ui/choice';
import {
  MODE_GLYPH,
  MODE_ORDER,
  MODE_SHORT,
} from '@/features/security/constants/security.constant';

type ModeControlProps = {
  value: GuardMode | null;
  onChange?: (mode: GuardMode) => void;
};

export function ModeControl({ value, onChange }: ModeControlProps) {
  const { t } = useTranslation();
  if (!onChange) return null;
  const options: ChoiceOption<GuardMode | ''>[] = MODE_ORDER.map((mode) => ({
    value: mode,
    label: t(MODE_SHORT[mode]),
    icon: MODE_GLYPH[mode],
  }));
  return (
    <Choice
      label={t('screens.security.hero.mode-label')}
      options={options}
      value={value ?? ''}
      onChange={(next) => {
        if (next !== '') onChange(next);
      }}
      glass
    />
  );
}
