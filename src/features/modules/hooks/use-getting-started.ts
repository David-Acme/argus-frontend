import { useCallback, useEffect, useMemo, useState } from 'react';
import { tk } from '@/core/i18n';
import { storageService } from '@/core/services/storage';
import { useAuthStore } from '@/core/stores';
import {
  CAPABILITY,
  MODULE_GETTING_STARTED_KEY,
  MODULE_SETTINGS_PATH,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { hasCapability } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  checklistItems,
  checklistVisible,
  dismissChecklist,
  EMPTY_SIGNALS,
  markDone,
  readChecklistState,
  withSignals,
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

const marked = new Set<(key: string) => void>();

const stepTitle = (stepId: string): string | null => {
  const key = `screens.modules.getting-started.steps.${stepId}`;
  const text = tk(key);
  return text === key ? null : text;
};

export function markGettingStartedStep(userId: string | number, stepId: string): void {
  const key = `${MODULE_GETTING_STARTED_KEY}${userId}`;
  const state = load(key);
  const next = markDone(state, stepId);
  if (next === state) return;
  persist(key, next);
  for (const listener of marked) listener(key);
}

export function useGettingStarted() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const view = useAccessView();
  const catalog = useModuleCatalog();
  const key = `${MODULE_GETTING_STARTED_KEY}${user?.id ?? 'anonymous'}`;
  const [stored, setStored] = useState<{ key: string; state: ChecklistState }>(() => ({ key, state: load(key) }));
  const cached = useViewCacheValue<ChecklistSignals>(VIEW_CACHE_KEYS.gettingStartedSignals);
  const signals = cached ?? EMPTY_SIGNALS;
  const state = useMemo(
    () => withSignals(stored.key === key ? stored.state : load(key), signals),
    [stored, key, signals]
  );

  const items = useMemo(
    () =>
      checklistItems(catalog, state, {
        owner: hasCapability(view, CAPABILITY.modulesManage),
        chooseTitle: t('screens.modules.getting-started.choose-title'),
        chooseHint: t('screens.modules.getting-started.choose-hint'),
        chooseRoute: MODULE_SETTINGS_PATH,
        stepTitle,
      }).filter((item) => item.route === null || routeFallback(item.route, view) === null),
    [catalog, state, t, view]
  );

  const save = useCallback(
    (next: ChecklistState) => {
      setStored({ key, state: next });
      persist(key, next);
    },
    [key]
  );

  const complete = useCallback((item: ChecklistItem) => save(markDone(state, item.id)), [save, state]);
  const dismiss = useCallback(() => save(dismissChecklist(state, items)), [items, save, state]);

  useEffect(() => {
    const listener = (changed: string) => {
      if (changed === key) setStored({ key, state: load(key) });
    };
    marked.add(listener);
    return () => {
      marked.delete(listener);
    };
  }, [key]);

  return { items, visible: checklistVisible(items), complete, dismiss };
}
