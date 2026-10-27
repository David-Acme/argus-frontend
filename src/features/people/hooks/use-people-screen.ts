import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { synchronizeService } from '@/core/services/sync';
import { useAuthStore } from '@/core/stores';
import { size, useWindowLayout } from '@/shared/theme';
import { INVITE_PARAM, PEOPLE_HREF } from '@/features/people/constants/people.constant';
import { useAsk } from '@/features/people/hooks/use-ask';
import { useInvitations } from '@/features/people/hooks/use-invitations';
import { useInvite } from '@/features/people/hooks/use-invite';
import { usePeople } from '@/features/people/hooks/use-people';
import { usePersonForm } from '@/features/people/hooks/use-person-form';
import { personRightsOf, selectedPerson } from '@/features/people/model/people';

type PeopleParams = { id?: string; invite?: string };

export function usePeopleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<PeopleParams>();
  const { windowClass } = useWindowLayout();
  const stacked = windowClass === 'compact' || windowClass === 'medium';
  const selfId = String(useAuthStore((state) => state.user?.id ?? ''));
  const people = usePeople();
  const asking = useAsk();
  const invitations = useInvitations(people.invites, asking);
  const invite = useInvite({
    startOpen: people.invites && params.invite === INVITE_PARAM,
    onCreated: invitations.preview.show,
  });
  const form = usePersonForm();
  const [picked, setPicked] = useState(params.id ?? '');
  const [refreshing, setRefreshing] = useState(false);
  const chosen = stacked ? (params.id ?? '') : picked;
  const person = selectedPerson(people.lines, chosen, !stacked);
  const missing = chosen !== '' && person === null && people.synced;
  const home = people.action === 'directory' ? PEOPLE_HREF.directory : PEOPLE_HREF.list;
  const fallback = stacked && chosen !== '' ? home : PEOPLE_HREF.profile;
  const leave = () => (router.canGoBack() ? router.back() : router.replace(fallback));
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([synchronizeService.syncOnce(), people.refreshPresence()]);
    setRefreshing(false);
  };
  return {
    people,
    person,
    missing,
    stacked,
    listWidth: windowClass === 'wide' ? size.columnWide : size.columnAside,
    detailOnly: stacked && chosen !== '',
    rights: person ? personRightsOf({ action: people.action, person }) : null,
    asking,
    invitations,
    invite,
    form,
    selfId,
    refresh: { refreshing, onRefresh: () => void refresh() },
    open: (id: string) =>
      stacked ? router.push({ pathname: PEOPLE_HREF.person, params: { id } }) : setPicked(id),
    edit: (id: string) => {
      const row = people.rows.find((candidate) => candidate.id === id);
      if (row) form.start(row);
    },
    leave,
  };
}

export type PeopleScreenState = ReturnType<typeof usePeopleScreen>;
