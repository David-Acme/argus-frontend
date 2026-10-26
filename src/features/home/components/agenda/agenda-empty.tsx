import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Chip } from '@/shared/ui/chip';
import { Cluster, Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { PressableSurface } from '@/shared/ui/pressable';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { useAskArgus, type AskArgus } from '@/features/home/hooks/use-ask-argus';

export type AgendaEmptyProps = { title: string };

type IdeaProps = { text: string; ask: AskArgus };

const IDEAS: readonly TranslationKey[] = [
  'screens.home.agenda-sections.ideas.water',
  'screens.home.agenda-sections.ideas.call',
  'screens.home.agenda-sections.ideas.tomorrow',
];

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

export function AgendaEmpty({ title }: AgendaEmptyProps) {
  const { t } = useTranslation();
  const column = useInScreenColumn();
  const ask = useAskArgus();
  const notice = (
    <Notice
      icon="check"
      title={t('screens.home.agenda-sections.empty-title')}
      body={t('screens.home.agenda-sections.empty-body')}
      action={
        ask
          ? {
              label: t('screens.home.agenda-sections.empty-action'),
              onPress: () => ask(t('screens.home.agenda-sections.empty-draft')),
              primary: true,
            }
          : undefined
      }
    />
  );
  const ideas = ask ? (
    <Cluster>
      {IDEAS.map((key) => (
        <Idea key={key} text={t(key)} ask={ask} />
      ))}
    </Cluster>
  ) : null;
  if (column && ideas) {
    return (
      <>
        <Section title={title} variant="plain">
          {notice}
        </Section>
        <Section title={t('screens.home.agenda-sections.ideas-title')} variant="plain">
          {ideas}
        </Section>
      </>
    );
  }
  return (
    <Section title={title} variant="plain">
      <Stack gap={3}>
        {notice}
        {ideas}
      </Stack>
    </Section>
  );
}
