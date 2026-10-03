import { useCallback, useState } from 'react';
import { t } from '@/core/i18n';
import { guardService } from '@/core/services/guard.service';
import type {
  GuardDecision,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardMode,
} from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { runServiceAction } from '@/shared/libs/service-action';
import { useRemoteResource } from './use-remote-resource';

const loadMode = () => guardService.mode();
const loadGuests = () => guardService.expectedGuests();
const loadIncidents = () => guardService.incidents();
const loadDecisions = async () => {
  const result = await guardService.decisions();
  return { ...result, info: result.info?.rows ?? null };
};

export function useGuardMode(enabled: boolean) {
  return useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardMode, load: loadMode, enabled });
}

export function useGuard(review: boolean) {
  const mode = useGuardMode(true);
  const guests = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardGuests, load: loadGuests });
  const incidents = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.guardIncidents, load: loadIncidents });
  const decisions = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.guardDecisions,
    load: loadDecisions,
    enabled: review,
  });
  const [pendingMode, setPendingMode] = useState<GuardMode | null>(null);
  const reloadMode = mode.reload;
  const reloadGuests = guests.reload;
  const mutateGuests = guests.mutate;
  const mutateDecisions = decisions.mutate;

  const setMode = useCallback(
    async (next: GuardMode) => {
      setPendingMode(next);
      const result = await runServiceAction({
        call: () => guardService.setMode(next),
        success: t('screens.security.mode.saved', { mode: t(`screens.security.mode.${next}`) }),
      });
      setPendingMode(null);
      if (result) await reloadMode();
    },
    [reloadMode]
  );

  const addGuest = useCallback(
    async (body: GuardExpectedGuestCreate): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => guardService.addExpectedGuest(body),
        success: t('screens.security.guests.saved'),
      });
      if (result) await reloadGuests();
      return result !== null;
    },
    [reloadGuests]
  );

  const removeGuest = useCallback(
    async (guest: GuardExpectedGuest) => {
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
      if (result) mutateGuests((previous) => (previous ?? []).filter((item) => item.id !== guest.id));
    },
    [mutateGuests]
  );

  const sendFeedback = useCallback(
    async (eventId: string, label: GuardFeedbackLabel) => {
      const result = await runServiceAction({
        call: () => guardService.feedback(eventId, label),
        success: t('screens.security.decisions.saved'),
      });
      if (!result) return;
      mutateDecisions((previous) =>
        (previous ?? []).map((decision: GuardDecision) =>
          decision.eventId === eventId ? { ...decision, feedbackLabel: label } : decision
        )
      );
    },
    [mutateDecisions]
  );

  return {
    mode: mode.data,
    guests: guests.data ?? [],
    incidents: incidents.data ?? [],
    decisions: decisions.data ?? [],
    loadedAt: guests.loadedAt,
    failed: mode.status === 'failed',
    pendingMode,
    reload: reloadMode,
    setMode,
    addGuest,
    removeGuest,
    sendFeedback,
  };
}
