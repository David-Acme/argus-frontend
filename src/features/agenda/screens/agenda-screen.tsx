import { useWindowLayout } from '@/shared/theme';
import { PanesAgenda, PhoneAgenda } from '@/features/agenda/components/agenda-layouts';
import { useAgendaScreen } from '@/features/agenda/hooks/use-agenda-screen';

export default function AgendaScreen() {
  const state = useAgendaScreen();
  const { windowClass } = useWindowLayout();
  if (windowClass === 'compact') return <PhoneAgenda state={state} />;
  return <PanesAgenda state={state} />;
}
