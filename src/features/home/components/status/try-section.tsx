import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Section } from '@/shared/ui/section';
import { IdeaChips } from '@/features/home/components/agenda/idea-chips';
import { useAskArgus } from '@/features/home/hooks/use-ask-argus';
import { tryPhrases } from '@/features/home/model/inicio-guide';

const PHRASE_KEYS = {
  'who-home': 'screens.home.inicio.try.who-home',
  night: 'screens.home.inicio.try.night',
  happened: 'screens.home.inicio.try.happened',
  today: 'screens.home.inicio.try.today',
} as const;

export function TrySection() {
  const { t } = useTranslation();
  const { has, guard } = useCapabilities();
  const ask = useAskArgus();
  const phrases = tryPhrases({
    events: has(CAPABILITY.eventsRead),
    presence: has(CAPABILITY.presenceRead),
    setsMode: guard.setMode,
    agenda: has(CAPABILITY.agendaRead) || has(CAPABILITY.remindersRead),
  });
  if (!ask || phrases.length === 0) return null;
  return (
    <Section title={t('screens.home.inicio.try.title')} variant="plain">
      <IdeaChips ideas={phrases.map((phrase) => t(PHRASE_KEYS[phrase]))} ask={ask} />
    </Section>
  );
}
