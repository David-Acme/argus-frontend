import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import { notificationService } from '@/core/services/notification.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { voiceService } from '@/core/services/voice';
import { useAuthStore } from '@/core/stores';
import type { GuardMode, VoiceAction } from '@/core/types';
import { GUARD_MODES, VIEW_CACHE_KEYS } from '@/shared/constants';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { detectedClasses, resolveCameraId, routeForScreen } from '@/shared/libs/voice-actions';
import { useTranslation } from './use-translation';
import { useVoiceSession } from './use-voice-session';

const RECENT_NOTIFICATIONS = 5;

const isGuardMode = (mode: unknown): mode is GuardMode =>
  typeof mode === 'string' && (GUARD_MODES as readonly string[]).includes(mode);

export function useCallBridge(): void {
  const router = useRouter();
  const { t, tk } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { isActive } = useVoiceSession();
  const lastEventCamera = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive || !user) return;
    const cameras = viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
    voiceService.sendContext({
      kind: 'note',
      text:
        cameras.length > 0
          ? t('screens.voice.context.cameras', { names: cameras.map((camera) => camera.name).join(', ') })
          : t('screens.voice.context.no-cameras'),
    });

    const seen = new Set<string>();
    let primed = false;
    const subscription = notificationService
      .observeForUser(String(user.id), RECENT_NOTIFICATIONS)
      .subscribe((rows) => {
        for (const row of rows) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          if (!primed || row.type !== 'camera') continue;
          const data = row.data ?? {};
          const camera = typeof data.cameraName === 'string' ? data.cameraName : '';
          if (!camera) continue;
          if (data.cameraId !== undefined) lastEventCamera.current = String(data.cameraId);
          const classes = detectedClasses(data).map((name) => {
            const key = `screens.voice.objects.${name}`;
            return tk(key) === key ? name : tk(key);
          });
          voiceService.sendContext({
            kind: 'cameraEvent',
            camera,
            text: classes.length > 0 ? classes.join(', ') : t('screens.voice.objects.something-moving'),
          });
        }
        primed = true;
      });
    return () => subscription.unsubscribe();
  }, [isActive, user, t, tk]);

  useEffect(() => {
    if (!user) return;
    const run = async (action: VoiceAction) => {
      if (action.name === 'app.show_camera') {
        const cameras = viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
        const id = resolveCameraId({
          requested: typeof action.arguments.camera === 'string' ? action.arguments.camera : '',
          cameras,
          lastEventCameraId: lastEventCamera.current,
        });
        if (id) router.push(`/cameras/${id}`);
        else toast.error(t('screens.voice.actions.camera-missing'));
        return;
      }
      if (action.name === 'app.open') {
        const route = routeForScreen(String(action.arguments.screen ?? ''), user.role);
        if (route) router.push(route as never);
        return;
      }
      const mode = action.arguments.mode;
      if (!isGuardMode(mode)) return;
      const result = await guardService.setMode(mode);
      if (result.ok) toast.success(t('screens.voice.actions.guard-mode', { mode: t(`screens.security.mode.${mode}`) }));
      else toastServiceError(result.errors);
    };
    return voiceService.onAction((action) => void run(action));
  }, [router, t, user]);
}
