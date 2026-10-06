import { useCallback, useMemo, useState } from 'react';
import { modulesService } from '@/core/services/modules';
import { storageService } from '@/core/services/storage';
import { useAuthStore } from '@/core/stores';
import { MODULE_REQUESTED_KEY } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { toastServiceError } from '@/shared/libs/service-error';
import {
  requestDay,
  requestOutcome,
  wasRequestedToday,
  withRequest,
  type RequestedToday,
} from '@/features/modules/model/module-request';

export function useModuleRequest() {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const key = `${MODULE_REQUESTED_KEY}${userId ?? 'anonymous'}`;
  const [requested, setRequested] = useState<RequestedToday>(() => storageService.getObject<RequestedToday>(key) ?? {});
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const today = requestDay(new Date());
  const alreadyAsked = useCallback(
    (moduleId: string) => wasRequestedToday(requested, moduleId, today),
    [requested, today]
  );

  const request = useCallback(
    async (moduleId: string, name: string) => {
      setPending(moduleId);
      const response = await modulesService.request(moduleId);
      setPending(null);
      const outcome = requestOutcome(response);
      if (outcome === 'sent' || outcome === 'again') {
        const next = withRequest(requested, moduleId, requestDay(new Date()));
        setRequested(next);
        storageService.setObject(key, next);
        toast.success(outcome === 'sent' ? t('screens.modules.request.sent', { name }) : t('screens.modules.request.again'));
        return;
      }
      if (outcome === 'soon') {
        setHidden((current) => new Set([...current, moduleId]));
        toast.info(t('screens.modules.request.soon', { name }));
        return;
      }
      if (outcome === 'active') {
        toast.info(t('screens.modules.request.active', { name }));
        return;
      }
      if (outcome === 'installing') {
        toast.info(t('screens.modules.request.installing', { name }));
        return;
      }
      toastServiceError(response.errors, t('screens.modules.request.failed'));
    },
    [key, requested, t]
  );

  return useMemo(() => ({ request, pending, alreadyAsked, hidden }), [alreadyAsked, hidden, pending, request]);
}
