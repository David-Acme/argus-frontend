import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/core/stores';
import type { IncidentResponse, ResponseVerdict } from '@/core/types';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';
import { alertsFor, canRespond, withVerdict } from '@/features/response/model/response';
import { bindResponseFeed } from '@/features/response/services/response-feed';
import { responseService } from '@/features/response/services/response.service';
import { useResponseStore } from '@/features/response/stores/response.store';

const CLOCK_MS = 30_000;

async function refresh(): Promise<void> {
  const result = await responseService.list();
  if (result.ok && result.info) useResponseStore.getState().replaceAll(result.info);
}

function useResponseSession(): void {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const respond = canRespond(useAccessView());
  const owner = userId === null ? null : String(userId);

  useEffect(() => {
    bindResponseFeed();
    if (useResponseStore.getState().ownerId !== owner) useResponseStore.getState().resetFor(owner);
  }, [owner]);

  useFocusEffect(
    useCallback(() => {
      if (owner !== null && respond) void refresh();
    }, [owner, respond])
  );
}

export function useResponses(): IncidentResponse[] {
  useResponseSession();
  const responses = useResponseStore((state) => state.responses);
  const view = useAccessView();
  const nowSeconds = Math.floor(useNow(CLOCK_MS) / 1000);
  return useMemo(() => alertsFor(view, responses, nowSeconds), [view, responses, nowSeconds]);
}

export function useResponse(responseId: number | null | undefined): IncidentResponse | null {
  useResponseSession();
  return useResponseStore((state) => (responseId == null ? null : (state.responses[responseId] ?? null)));
}

export function useResponseVerdict() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return useCallback(
    async (response: IncidentResponse, verdict: ResponseVerdict): Promise<boolean> => {
      if (!user) return false;
      const store = useResponseStore.getState();
      const before = response;
      const result = await runServiceAction({
        confirm:
          verdict === 'false_alarm'
            ? {
                title: t('screens.response.confirm-false-title'),
                description: t('screens.response.confirm-false-description'),
                confirmLabel: t('screens.response.false-alarm'),
                cancelLabel: t('common.cancel'),
              }
            : undefined,
        call: () => {
          store.apply(
            withVerdict(response, verdict, { userId: user.id, name: user.name }, Math.floor(Date.now() / 1000))
          );
          return responseService.decide(response.id, verdict);
        },
        errorTitle: t('screens.response.verdict-failed'),
      });
      if (!result?.info) {
        useResponseStore.setState((state) => ({ responses: { ...state.responses, [before.id]: before } }));
        return false;
      }
      store.apply(result.info);
      return true;
    },
    [t, user]
  );
}
