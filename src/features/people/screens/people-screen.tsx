import { PanesPeople, PhonePeople, PhonePerson } from '@/features/people/components/people-layouts';
import { usePeopleScreen } from '@/features/people/hooks/use-people-screen';

export default function PeopleScreen() {
  const state = usePeopleScreen();
  if (!state.stacked) return <PanesPeople state={state} />;
  if (state.detailOnly) return <PhonePerson state={state} />;
  return <PhonePeople state={state} />;
}
