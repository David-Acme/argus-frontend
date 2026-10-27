import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { Section } from '@/shared/ui/section';
import { useAskArgus } from '@/features/home/hooks/use-ask-argus';

export type AgendaEmptyProps = { title: string };

export function AgendaEmpty({ title }: AgendaEmptyProps) {
  const { t } = useTranslation();
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
  return (
    <Section title={title} variant="plain">
      {notice}
    </Section>
  );
}
