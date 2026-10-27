import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ICameraCacheRow, INotificationPreviewCacheRow } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { useAuthStore } from '@/core/stores';
import type { CalendarEntry, GuardEnvironment, VoiceContext } from '@/core/types';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  CALL_SITUATION_AGENDA_ITEMS,
  CALL_SITUATION_DEBOUNCE_MS,
  CALL_SITUATION_EVENTS,
} from '@/features/voice/constants/voice';
import { useBridgeActions } from '@/features/voice/hooks/use-bridge-actions';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';
import { buildCallSituation } from '@/features/voice/model/call-situation';
import type { CallSituationEvent } from '@/features/voice/model/call-situation';
import { contextTarget } from '@/features/voice/model/context-target';
import { callCameraEvent, detectedClasses } from '@/features/voice/model/voice-actions';
import { assistantChat } from '@/features/voice/services/chat';
import { voiceService } from '@/features/voice/services/voice';

const RECENT_NOTIFICATIONS = 5;

const subscribeChat = (listener: () => void): (() => void) => assistantChat.subscribe(listener);

const chatOpenNow = (): boolean => assistantChat.snapshot.open;

export function useCallBridge(): void {
  const { t, tk } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { cameraActions, guard: guardAccess, has } = useCapabilities();
  const watchesCameras = cameraActions.watch;
  const readsGuard = guardAccess.view;
  const readsAgenda = has(CAPABILITY.agendaRead);
  const { isActive } = useVoiceSession();
  const chatOpen = useSyncExternalStore(subscribeChat, chatOpenNow, chatOpenNow);
  const target = contextTarget({ voiceActive: isActive, chatOpen });
  const lastEventCamera = useRef<string | null>(null);
  useBridgeActions(lastEventCamera);

  useEffect(() => {
    if (target === null || !user) return;
    const sendContext = (context: VoiceContext) =>
      target === 'voice' ? voiceService.sendContext(context) : assistantChat.sendContext(context);
    const cameras = () =>
      watchesCameras ? viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList) : [];
    const sendCameras = () => {
      if (!watchesCameras) return;
      const names = cameras().map((camera) => camera.name);
      sendContext({
        kind: 'note',
        text:
          names.length > 0
            ? t('screens.voice.context.cameras', { names: names.join(', ') })
            : t('screens.voice.context.no-cameras'),
      });
    };
    sendCameras();

    const events: CallSituationEvent[] = [];
    const seen = new Set<string>();
    let fetchedGuard: readonly GuardEnvironment[] = [];
    let lastSituation = '';
    let timer: ReturnType<typeof setTimeout> | null = null;
    let primed = false;
    let live = true;

    const guard = (): readonly GuardEnvironment[] => {
      if (!readsGuard) return [];
      return (
        viewCacheService.readValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments) ??
        fetchedGuard
      );
    };

    const pushSituation = () => {
      timer = null;
      if (!live) return;
      const text = buildCallSituation({
        t,
        guard: guard(),
        agenda: readsAgenda
          ? viewCacheService.read<CalendarEntry>(VIEW_CACHE_KEYS.dashboardAgenda, 'today')
          : [],
        agendaItems: CALL_SITUATION_AGENDA_ITEMS,
        events,
        offlineCameras: cameras()
          .filter((camera) => camera.isEnabled && !camera.isOnline)
          .map((camera) => camera.name),
      });
      if (text === lastSituation) return;
      lastSituation = text;
      sendContext({ kind: 'situation', text });
    };

    const scheduleSituation = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(pushSituation, CALL_SITUATION_DEBOUNCE_MS);
    };

    const announce = () => {
      if (!watchesCameras) return;
      const rows = viewCacheService
        .rowsSnapshot<INotificationPreviewCacheRow>(VIEW_CACHE_KEYS.dashboardNotifications)
        .slice(0, RECENT_NOTIFICATIONS);
      let changed = false;
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        if (!primed) continue;
        const event = callCameraEvent({
          type: row.type,
          body: row.body,
          data: row.data,
          cameras: cameras(),
        });
        if (!event) continue;
        if (event.cameraId) lastEventCamera.current = event.cameraId;
        const classes = detectedClasses(row.data ?? {}).map((name) => {
          const key = `screens.voice.objects.${name}`;
          return tk(key) === key ? name : tk(key);
        });
        const what =
          event.guardCopy ??
          (classes.length > 0 ? classes.join(', ') : t('screens.voice.objects.something-moving'));
        sendContext({ kind: 'cameraEvent', camera: event.camera, text: what });
        events.push({
          camera: event.camera,
          what: event.guardCopy ? row.title : what,
          at: Date.now(),
        });
        if (events.length > CALL_SITUATION_EVENTS) events.shift();
        changed = true;
      }
      primed = true;
      if (changed) scheduleSituation();
    };

    announce();
    pushSituation();
    if (
      readsGuard &&
      !viewCacheService.readValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments)
    ) {
      void guardService.environments().then((result) => {
        if (!live || !result.ok || !result.info) return;
        fetchedGuard = result.info;
        scheduleSituation();
      });
    }

    const unsubscribers = [
      voiceService.onResumed(() => {
        sendCameras();
        lastSituation = '';
        pushSituation();
      }),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.dashboardNotifications, undefined, announce),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.dashboardAgenda, 'today', scheduleSituation),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.cameraList, undefined, scheduleSituation),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.guardEnvironments, undefined, scheduleSituation),
    ];
    return () => {
      live = false;
      if (timer !== null) clearTimeout(timer);
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [target, user, t, tk, watchesCameras, readsGuard, readsAgenda]);
}
