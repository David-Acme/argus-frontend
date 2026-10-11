import { useCallback, useEffect, useMemo, useState } from 'react';
import { combineLatest, startWith, type Observable } from 'rxjs';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { cameraService } from '@/core/services/camera.service';
import { projectService } from '@/core/services/project.service';
import { userInvitationService } from '@/core/services/user-invitation.service';
import { userService } from '@/core/services/user.service';
import { zoneService } from '@/core/services/zone.service';
import { storageService } from '@/core/services/storage';
import { useAuthStore } from '@/core/stores';
import { CAPABILITY, MODULE_GETTING_STARTED_KEY, MODULE_SETTINGS_PATH } from '@/shared/constants';
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

export function useGettingStarted() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const view = useAccessView();
  const catalog = useModuleCatalog();
  const key = `${MODULE_GETTING_STARTED_KEY}${user?.id ?? 'anonymous'}`;
  const [stored, setStored] = useState<{ key: string; state: ChecklistState }>(() => ({ key, state: load(key) }));
  const [signals, setSignals] = useState<ChecklistSignals>(EMPTY_SIGNALS);
  const state = withSignals(stored.key === key ? stored.state : load(key), signals);

  useEffect(() => {
    const count = (source: { observeCount(): Observable<number> }) =>
      source.observeCount().pipe(startWith(0));
    const subscription = combineLatest({
      cameras: count(cameraService),
      zones: count(zoneService),
      events: count(calendarEventService),
      projects: count(projectService),
      people: count(userService),
      invitations: count(userInvitationService),
    }).subscribe(setSignals);
    return () => subscription.unsubscribe();
  }, []);

  const items = useMemo(
    () =>
      checklistItems(catalog, state, {
        owner: hasCapability(view, CAPABILITY.modulesManage),
        chooseTitle: t('screens.modules.getting-started.choose-title'),
        chooseHint: t('screens.modules.getting-started.choose-hint'),
        chooseRoute: MODULE_SETTINGS_PATH,
      }).filter((item) => item.route === null || routeFallback(item.route, view) === null),
    [catalog, state, t, view]
  );

  const save = useCallback(
    (next: ChecklistState) => {
      setStored({ key, state: next });
      try {
        storageService.setObject(key, next);
      } catch {
      }
    },
    [key]
  );

  const complete = useCallback((item: ChecklistItem) => save(markDone(state, item.id)), [save, state]);
  const dismiss = useCallback(() => save(dismissChecklist(state, items)), [items, save, state]);

  return { items, visible: checklistVisible(items), complete, dismiss };
}
