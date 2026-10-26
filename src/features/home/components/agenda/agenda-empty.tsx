import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { useAskArgus } from '@/features/home/hooks/use-ask-argus';
import { IdeaChips } from './idea-chips';

export type AgendaEmptyProps = { title: string };

const IDEAS: readonly TranslationKey[] = [
  'screens.home.agenda-sections.ideas.water',
  'screens.home.agenda-sections.ideas.call',
  'screens.home.agenda-sections.ideas.tomorrow',
];

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
  const ideas = ask ? <IdeaChips ideas={IDEAS.map((key) => t(key))} ask={ask} /> : null;
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
