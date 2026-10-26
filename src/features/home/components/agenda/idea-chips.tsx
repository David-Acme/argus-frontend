import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Chip } from '@/shared/ui/chip';
import { Cluster } from '@/shared/ui/layout';
import { PressableSurface } from '@/shared/ui/pressable';
import type { AskArgus } from '@/features/home/hooks/use-ask-argus';

export type IdeaChipsProps = { ideas: readonly string[]; ask: AskArgus };

type IdeaProps = { text: string; ask: AskArgus };

const IDEA_SLOP = (size.target - size.chipSuggestion) / 2;

function Idea({ text, ask }: IdeaProps) {
  const { t } = useTranslation();
  return (
    <PressableSurface
      a11y={{ label: t('screens.home.agenda-sections.ask', { text }), role: 'button' }}
      onPress={() => ask(text)}
      pressed={{ scale: 'surface' }}
      hitSlop={IDEA_SLOP}>
      <Chip label={t('screens.home.agenda-sections.quoted', { text })} size="suggestion" />
    </PressableSurface>
  );
}

export function IdeaChips({ ideas, ask }: IdeaChipsProps) {
  return (
    <Cluster>
      {ideas.map((text) => (
        <Idea key={text} text={text} ask={ask} />
      ))}
    </Cluster>
  );
}
