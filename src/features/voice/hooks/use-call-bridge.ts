import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ICameraCacheRow, INotificationPreviewCacheRow } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { voiceService } from '@/features/voice/services/voice';
import { useAuthStore } from '@/core/stores';
import type { CalendarEntry, GuardMode, GuardModeState, VoiceAction, VoiceActionOutcome } from '@/core/types';
import { GUARD_MODES, VIEW_CACHE_KEYS } from '@/shared/constants';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { serviceErrorKey } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import {
  CALL_SITUATION_AGENDA_ITEMS,
  CALL_SITUATION_DEBOUNCE_MS,
  CALL_SITUATION_EVENTS,
} from '@/features/voice/constants/voice';
import { buildCallSituation, spokenDetail, type CallSituationEvent } from '@/features/voice/model/call-situation';
import { callCameraEvent, detectedClasses, resolveCameraId, routeForScreen } from '@/features/voice/model/voice-actions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';

const RECENT_NOTIFICATIONS = 5;
const CALL_ROUTE = '/call';

const isGuardMode = (mode: unknown): mode is GuardMode =>
  typeof mode === 'string' && (GUARD_MODES as readonly string[]).includes(mode);

export function useCallBridge(): void {
  const router = useRouter();
  const pathname = usePathname();
  const { t, tk } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { isActive } = useVoiceSession();
  const lastEventCamera = useRef<string | null>(null);
  const onCallScreen = useRef(pathname === CALL_ROUTE);

  useEffect(() => {
    onCallScreen.current = pathname === CALL_ROUTE;
  }, [pathname]);

  useEffect(() => {
    if (!isActive || !user) return;
    const cameras = () => viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
    const names = cameras().map((camera) => camera.name);
    voiceService.sendContext({
      kind: 'note',
      text:
        names.length > 0
          ? t('screens.voice.context.cameras', { names: names.join(', ') })
          : t('screens.voice.context.no-cameras'),
    });

    const guardView = guardAccessForRole(user.role).view;
    const events: CallSituationEvent[] = [];
    const seen = new Set<string>();
    let fetchedMode: GuardMode | null = null;
    let lastSituation = '';
    let timer: ReturnType<typeof setTimeout> | null = null;
    let primed = false;
    let live = true;

    const guardMode = (): GuardMode | null => {
      if (!guardView) return null;
      return viewCacheService.readValue<GuardModeState>(VIEW_CACHE_KEYS.guardMode)?.mode ?? fetchedMode;
    };

    const pushSituation = () => {
      timer = null;
      if (!live) return;
      const text = buildCallSituation({
        t,
        guardMode: guardMode(),
        agenda: viewCacheService.read<CalendarEntry>(VIEW_CACHE_KEYS.dashboardAgenda, 'today'),
        agendaItems: CALL_SITUATION_AGENDA_ITEMS,
        events,
        offlineCameras: cameras()
          .filter((camera) => camera.isEnabled && !camera.isOnline)
          .map((camera) => camera.name),
      });
      if (text === lastSituation) return;
      lastSituation = text;
      voiceService.sendContext({ kind: 'situation', text });
    };

    const scheduleSituation = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(pushSituation, CALL_SITUATION_DEBOUNCE_MS);
    };

    const announce = () => {
      const rows = viewCacheService
        .rowsSnapshot<INotificationPreviewCacheRow>(VIEW_CACHE_KEYS.dashboardNotifications)
        .slice(0, RECENT_NOTIFICATIONS);
      let changed = false;
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        if (!primed) continue;
        const event = callCameraEvent({ type: row.type, body: row.body, data: row.data, cameras: cameras() });
        if (!event) continue;
        if (event.cameraId) lastEventCamera.current = event.cameraId;
        const classes = detectedClasses(row.data ?? {}).map((name) => {
          const key = `screens.voice.objects.${name}`;
          return tk(key) === key ? name : tk(key);
        });
        const what =
          event.guardCopy ?? (classes.length > 0 ? classes.join(', ') : t('screens.voice.objects.something-moving'));
        voiceService.sendContext({ kind: 'cameraEvent', camera: event.camera, text: what });
        events.push({ camera: event.camera, what: event.guardCopy ? row.title : what, at: Date.now() });
        if (events.length > CALL_SITUATION_EVENTS) events.shift();
        changed = true;
      }
      primed = true;
      if (changed) scheduleSituation();
    };

    announce();
    pushSituation();
    if (guardView && !viewCacheService.readValue<GuardModeState>(VIEW_CACHE_KEYS.guardMode)) {
      void guardService.mode().then((result) => {
        if (!live || !result.ok || !result.info) return;
        fetchedMode = result.info.mode;
        scheduleSituation();
      });
    }

    const unsubscribers = [
      viewCacheService.subscribe(VIEW_CACHE_KEYS.dashboardNotifications, undefined, announce),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.dashboardAgenda, 'today', scheduleSituation),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.cameraList, undefined, scheduleSituation),
      viewCacheService.subscribe(VIEW_CACHE_KEYS.guardMode, undefined, scheduleSituation),
    ];
    return () => {
      live = false;
      if (timer !== null) clearTimeout(timer);
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [isActive, user, t, tk]);

  useEffect(() => {
    if (!user) return;
    const failed = (detail: string): VoiceActionOutcome => ({ ok: false, detail: spokenDetail(detail) });
    const run = async (action: VoiceAction): Promise<VoiceActionOutcome> => {
      if (action.name === 'app.show_camera') {
        const id = resolveCameraId({
          requested: typeof action.arguments.camera === 'string' ? action.arguments.camera : '',
          cameras: viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList),
          lastEventCameraId: lastEventCamera.current,
        });
        if (!id) {
          toast.error(t('screens.voice.actions.camera-missing'));
          return failed(t('screens.voice.actions.detail.camera-missing'));
        }
        if (onCallScreen.current) voiceService.showCamera(id);
        else router.push(`/cameras/${id}`);
        return { ok: true, detail: null };
      }
      if (action.name === 'app.open') {
        const route = routeForScreen(String(action.arguments.screen ?? ''), user.role);
        if (!route) return failed(t('screens.voice.actions.detail.no-access'));
        router.push(route as never);
        return { ok: true, detail: null };
      }
      const mode = action.arguments.mode;
      if (!isGuardMode(mode)) return failed(t('screens.voice.actions.detail.bad-mode'));
      const result = await guardService.setMode(mode);
      if (!result.ok) {
        const message = t(serviceErrorKey(result.errors));
        toast.error(message);
        return failed(message);
      }
      const current = viewCacheService.readValue<GuardModeState>(VIEW_CACHE_KEYS.guardMode);
      if (current) viewCacheService.writeValue(VIEW_CACHE_KEYS.guardMode, { ...current, mode });
      toast.success(t('screens.voice.actions.guard-mode', { mode: t(`screens.security.mode.${mode}`) }));
      return { ok: true, detail: null };
    };
    let queue = Promise.resolve();
    return voiceService.onAction((action) => {
      queue = queue.then(async () => {
        const outcome = await run(action).catch(() => failed(t('screens.voice.actions.detail.failed')));
        voiceService.completeAction(action.id, outcome);
      });
    });
  }, [router, t, user]);
}
