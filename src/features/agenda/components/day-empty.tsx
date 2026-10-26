import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Chip } from '@/shared/ui/chip';
import { Cluster, Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { PressableSurface } from '@/shared/ui/pressable';
import { Empty } from '@/shared/ui/resource-view';
import { useArgusDraft } from '@/features/agenda/hooks/use-argus-draft';
import type { ArgusDraft } from '@/features/agenda/hooks/use-argus-draft';

export type DayEmptyProps = { today: boolean; onCreate?: () => void };

export type IdeasProps = { ideas: readonly TranslationKey[] };

type IdeaProps = { text: string; ask: ArgusDraft };

export const LIST_IDEAS: readonly TranslationKey[] = [
  'screens.agenda.empty.idea-light',
  'screens.agenda.empty.idea-dentist',
];

export const ASIDE_IDEAS: readonly TranslationKey[] = [
  ...LIST_IDEAS,
  'screens.agenda.empty.idea-project',
];

const IDEA_SLOP = (size.target - size.chipSuggestion) / 2;

function Idea({ text, ask }: IdeaProps) {
  const { t } = useTranslation();
  return (
    <PressableSurface
      a11y={{ label: t('screens.agenda.empty.ask', { text }), role: 'button' }}
      onPress={() => ask(text)}
      pressed={{ scale: 'surface' }}
      hitSlop={IDEA_SLOP}>
      <Chip label={text} icon="mic" size="suggestion" />
    </PressableSurface>
  );
}

export function Ideas({ ideas }: IdeasProps) {
  const { t } = useTranslation();
  const ask = useArgusDraft();
  if (!ask) return null;
  return (
    <Cluster>
      {ideas.map((key) => (
        <Idea key={key} text={t(key)} ask={ask} />
      ))}
    </Cluster>
  );
}

export function DayEmpty({ today, onCreate }: DayEmptyProps) {
  const { t } = useTranslation();
  const title = t(today ? 'screens.agenda.empty.today-title' : 'screens.agenda.empty.day-title');
  return (
    <Stack gap={4}>
      {onCreate ? (
        <Empty
          icon="cal"
          message={title}
          detail={t('screens.agenda.empty.body')}
          action={{ label: t('screens.agenda.empty.action'), onPress: onCreate }}
        />
      ) : (
        <Notice icon="cal" title={title} body={t('screens.agenda.empty.read-only')} />
      )}
      {onCreate ? <Ideas ideas={LIST_IDEAS} /> : null}
    </Stack>
  );
}
