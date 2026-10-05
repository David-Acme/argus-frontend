import { useCallback } from 'react';
import { guardService } from '@/core/services/guard.service';
import type { EnvironmentResponseConfig, RecipientMode, ResponseContact } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toastServiceError } from '@/shared/libs/service-error';
import {
  moveRecipient,
  toUpdate,
  withDuty,
  withMode,
  type MoveDirection,
} from '@/features/security/model/response-recipients';

type ConfigEdit = (config: EnvironmentResponseConfig) => EnvironmentResponseConfig;

export function useEnvironmentResponse(environmentId: number, owner: boolean) {
  const { t } = useTranslation();
  const load = useCallback(() => guardService.response(environmentId), [environmentId]);
  const { data, status, mutate, reload } = useRemoteResource<EnvironmentResponseConfig>({
    cacheKey: VIEW_CACHE_KEYS.guardResponse,
    scope: String(environmentId),
    load,
  });

  const save = useCallback(
    async (edit: ConfigEdit): Promise<boolean> => {
      if (!owner || !data) return false;
      const next = edit(data);
      mutate(() => next);
      const result = await guardService.setResponse(environmentId, toUpdate(next));
      if (!result.ok || !result.info) {
        toastServiceError(result.errors, t('screens.response.recipients.save-failed'));
        void reload();
        return false;
      }
      const saved = result.info;
      mutate(() => saved);
      return true;
    },
    [data, environmentId, mutate, owner, reload, t]
  );

  const setMode = useCallback(
    (userId: number, mode: RecipientMode) =>
      save((config) => ({ ...config, recipients: withMode(config.recipients, userId, mode) })),
    [save]
  );

  const move = useCallback(
    (userId: number, direction: MoveDirection) =>
      save((config) => ({ ...config, recipients: moveRecipient(config.recipients, userId, direction) })),
    [save]
  );

  const setContacts = useCallback(
    (contacts: readonly ResponseContact[]) =>
      save((config) => ({
        ...config,
        contacts: contacts.map((contact, index) => ({ ...contact, id: -1 - index })),
      })),
    [save]
  );

  const setEmergency = useCallback(
    (emergencyNumber: string) => save((config) => ({ ...config, emergencyNumber })),
    [save]
  );

  const setStepSeconds = useCallback(
    (stepSeconds: number) => save((config) => ({ ...config, stepSeconds })),
    [save]
  );

  const setDuty = useCallback(
    async (userId: number, onDuty: boolean): Promise<boolean> => {
      if (!data) return false;
      if (owner) {
        return save((config) => ({
          ...config,
          recipients: withDuty(config.recipients, { userId, onDuty, staffedNow: config.staffedNow }),
        }));
      }
      mutate((previous) =>
        previous
          ? {
              ...previous,
              recipients: withDuty(previous.recipients, { userId, onDuty, staffedNow: previous.staffedNow }),
            }
          : previous
      );
      const result = await guardService.setDuty(environmentId, onDuty);
      if (!result.ok || !result.info) {
        toastServiceError(result.errors, t('screens.response.recipients.save-failed'));
        void reload();
        return false;
      }
      const saved = result.info;
      mutate(() => saved);
      return true;
    },
    [data, environmentId, mutate, owner, reload, save, t]
  );

  return { config: data, status, setMode, move, setContacts, setEmergency, setStepSeconds, setDuty };
}
