import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Chip } from '@/shared/ui/chip';
import { Cluster } from '@/shared/ui/layout';
import { PressableSurface } from '@/shared/ui/pressable';
import { SUGGESTION_KEYS } from '@/features/conversations/constants/conversation.constant';
import type { Suggestion } from '@/features/conversations/model/suggestions';

export type SuggestionChipsProps = {
  suggestions: readonly Suggestion[];
  onPick: (text: string, send: boolean) => void;
};

type SuggestionChipProps = { suggestion: Suggestion; onPick: SuggestionChipsProps['onPick'] };

const CHIP_SLOP = (size.target - size.chipSuggestion) / 2;

function SuggestionChip({ suggestion, onPick }: SuggestionChipProps) {
  const { t } = useTranslation();
  const text =
    suggestion.id === 'show-camera'
      ? t('screens.conversations.suggest.show-camera', { name: suggestion.camera ?? '' })
      : t(SUGGESTION_KEYS[suggestion.id]);
  const words = suggestion.send ? text : t('screens.conversations.suggest.remind-draft');
  return (
    <PressableSurface
      a11y={{ label: text, role: 'button' }}
      onPress={() => onPick(words, suggestion.send)}
      pressed={{ scale: 'surface' }}
      hitSlop={CHIP_SLOP}>
      <Chip label={text} size="suggestion" />
    </PressableSurface>
  );
}

export function SuggestionChips({ suggestions, onPick }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;
  return (
    <Cluster>
      {suggestions.map((suggestion) => (
        <SuggestionChip key={suggestion.id} suggestion={suggestion} onPick={onPick} />
      ))}
    </Cluster>
  );
}
