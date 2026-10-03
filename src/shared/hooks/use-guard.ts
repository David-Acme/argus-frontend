import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { guardService } from '@/core/services/guard.service';
import type {
  GuardDecision,
  GuardExpectedGuest,
  GuardExpectedGuestCreate,
  GuardFeedbackLabel,
  GuardIncident,
  GuardMode,
  GuardModeState,
} from '@/core/types';
import { toastServiceError } from '@/shared/libs/service-error';

type GuardData = {
  loadedAt: number;
  mode: GuardModeState | null;
  guests: GuardExpectedGuest[];
  incidents: GuardIncident[];
  decisions: GuardDecision[];
};

const EMPTY: GuardData = { loadedAt: 0, mode: null, guests: [], incidents: [], decisions: [] };

export function useGuard(review: boolean) {
  const [data, setData] = useState<GuardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pendingMode, setPendingMode] = useState<GuardMode | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = generation.current + 1;
    generation.current = current;
    setLoading(true);
    const [mode, guests, incidents, decisions] = await Promise.all([
      guardService.mode(),
      guardService.expectedGuests(),
      guardService.incidents(),
      review ? guardService.decisions() : Promise.resolve(null),
    ]);
    if (current !== generation.current) return;
    setFailed(!mode.ok);
    setData({
      loadedAt: Date.now(),
      mode: mode.ok ? mode.info : null,
      guests: guests.ok ? (guests.info ?? []) : [],
      incidents: incidents.ok ? (incidents.info ?? []) : [],
      decisions: decisions?.ok ? (decisions.info?.rows ?? []) : [],
    });
    setLoading(false);
  }, [review]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const setMode = useCallback(
    async (mode: GuardMode): Promise<boolean> => {
      setPendingMode(mode);
      const result = await guardService.setMode(mode);
      setPendingMode(null);
      if (!result.ok) {
        toastServiceError(result.errors);
        return false;
      }
      const state = await guardService.mode();
      if (state.ok && state.info) setData((previous) => ({ ...previous, mode: state.info }));
      return true;
    },
    []
  );

  const addGuest = useCallback(
    async (body: GuardExpectedGuestCreate): Promise<boolean> => {
      const result = await guardService.addExpectedGuest(body);
      if (!result.ok) {
        toastServiceError(result.errors);
        return false;
      }
      const guests = await guardService.expectedGuests();
      if (guests.ok) setData((previous) => ({ ...previous, guests: guests.info ?? [] }));
      return true;
    },
    []
  );

  const removeGuest = useCallback(async (id: number): Promise<boolean> => {
    const result = await guardService.removeExpectedGuest(id);
    if (!result.ok) {
      toastServiceError(result.errors);
      return false;
    }
    setData((previous) => ({ ...previous, guests: previous.guests.filter((guest) => guest.id !== id) }));
    return true;
  }, []);

  const sendFeedback = useCallback(
    async (eventId: string, label: GuardFeedbackLabel): Promise<boolean> => {
      const result = await guardService.feedback(eventId, label);
      if (!result.ok) {
        toastServiceError(result.errors);
        return false;
      }
      setData((previous) => ({
        ...previous,
        decisions: previous.decisions.map((decision) =>
          decision.eventId === eventId ? { ...decision, feedbackLabel: label } : decision
        ),
      }));
      return true;
    },
    []
  );

  return { ...data, loading, failed, pendingMode, reload: load, setMode, addGuest, removeGuest, sendFeedback };
}
