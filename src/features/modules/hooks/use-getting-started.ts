import { useCallback, useMemo, useState } from 'react';
import { tk } from '@/core/i18n';
import { storageService } from '@/core/services/storage';
import { useAuthStore } from '@/core/stores';
import type { GuardEnvironment } from '@/core/types';
import {
  CAPABILITY,
  IS_NATIVE,
  MODULE_GETTING_STARTED_KEY,
  MODULE_SETTINGS_PATH,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { assistantEntryHref, readAssistantMode, resolveAssistantMode } from '@/shared/libs/assistant-mode';
import { hasCapability } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  checklistItems,
  checklistVisible,
  chosenGuardModes,
  completedBySignals,
  dismissChecklist,
  EMPTY_SIGNALS,
  markDone,
  readChecklistState,
  type ChecklistItem,
  type ChecklistSignals,
  type ChecklistState,
} from '@/features/modules/model/getting-started';

const load = (key: string): ChecklistState => {
  try {
    return readChecklistState(storageService.getObject<unknown>(key));
  } catch {
    return readChecklistState(null);
  }
};

const persist = (key: string, state: ChecklistState): void => {
  try {
    storageService.setObject(key, state);
  } catch {
  }
};

const stepTitle = (stepId: string): string | null => {
  const key = `screens.modules.getting-started.steps.${stepId}`;
  const text = tk(key);
  return text === key ? null : text;
};

export function useGettingStarted() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const view = useAccessView();
  const catalog = useModuleCatalog();
  const key = `${MODULE_GETTING_STARTED_KEY}${user?.id ?? 'anonymous'}`;
  const [stored, setStored] = useState<{ key: string; state: ChecklistState }>(() => ({ key, state: load(key) }));
  const cached = useViewCacheValue<ChecklistSignals>(VIEW_CACHE_KEYS.gettingStartedSignals);
  const environments = useViewCacheValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments);
  const state = stored.key === key ? stored.state : load(key);
  const evidence = useMemo(
    () => completedBySignals({ ...(cached ?? EMPTY_SIGNALS), guardModes: chosenGuardModes(environments) }),
    [cached, environments]
  );
  const assistantHref = useMemo(
    () =>
      assistantEntryHref(
        resolveAssistantMode({
          voice: hasCapability(view, CAPABILITY.assistantVoice),
          chat: hasCapability(view, CAPABILITY.messagesRelay),
          stored: readAssistantMode(),
          native: IS_NATIVE,
        })
      ),
    [view]
  );

  const items = useMemo(
    () =>
      checklistItems(catalog, state, {
        owner: hasCapability(view, CAPABILITY.modulesManage),
        chooseTitle: t('screens.modules.getting-started.choose-title'),
        chooseHint: t('screens.modules.getting-started.choose-hint'),
        chooseRoute: MODULE_SETTINGS_PATH,
        assistantHref,
        evidence,
        stepTitle,
      }).filter((item) => item.route === null || routeFallback(item.route, view) === null),
    [assistantHref, catalog, evidence, state, t, view]
  );

  const save = useCallback(
    (next: ChecklistState) => {
      setStored({ key, state: next });
      persist(key, next);
    },
    [key]
  );

  const complete = useCallback(
    (item: ChecklistItem) => {
      if (item.manual) save(markDone(state, item.id));
    },
    [save, state]
  );
  const dismiss = useCallback(() => save(dismissChecklist(state, items)), [items, save, state]);

  return { items, visible: checklistVisible(items), complete, dismiss };
}
