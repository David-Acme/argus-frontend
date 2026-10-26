import { t } from '@/core/i18n';
import { guardService } from '@/core/services/guard.service';
import type { GuardExpectedGuest, GuardExpectedGuestCreate, ResourceMatch } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { runServiceAction } from '@/shared/libs/service-action';

const GUARD_EXPECTED_VISITS: readonly ResourceMatch[] = [
  { domain: 'guard', scope: 'expected_visits' },
];

const NO_GUESTS: readonly GuardExpectedGuest[] = [];

const loadGuests = () => guardService.expectedGuests();

export function useExpectedGuests(enabled = true) {
  const guests = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.guardGuests,
    load: loadGuests,
    enabled,
    resources: GUARD_EXPECTED_VISITS,
  });

  async function add(body: GuardExpectedGuestCreate): Promise<boolean> {
    const result = await runServiceAction({
      call: () => guardService.addExpectedGuest(body),
      success: t('screens.security.guests.saved'),
    });
    if (result) await guests.reload();
    return result !== null;
  }

  async function remove(guest: GuardExpectedGuest): Promise<void> {
    const result = await runServiceAction({
      confirm: {
        title: t('screens.security.guests.remove-title'),
        description: t('screens.security.guests.remove-description', { name: guest.description }),
        confirmLabel: t('screens.security.guests.remove'),
        intent: 'danger',
      },
      call: () => guardService.removeExpectedGuest(guest.id),
      success: t('screens.security.guests.removed'),
    });
    if (result)
      guests.mutate((previous) => (previous ?? []).filter((item) => item.id !== guest.id));
  }

  return {
    list: guests.data ?? NO_GUESTS,
    ready: guests.data != null,
    loadedAt: guests.loadedAt,
    reload: guests.reload,
    add,
    remove,
  };
}
