import { useRouter } from 'expo-router';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { guardService } from '@/core/services/guard.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useAccessView, useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';
import { GUARD_MODE_KEYS } from '@/features/voice/constants/result.constant';
import type {
  EventMovedResult,
  GuardModeResult,
  ReminderResult,
  ScreenResult,
} from '@/features/voice/model/argus-result';
import { routeForScreen } from '@/features/voice/model/voice-actions';
import { assistantChat } from '@/features/voice/services/chat';
import { argusResults } from '@/features/voice/services/results';

export type ResultSurface = 'chat' | 'call';

export type ResultActions = {
  surface: ResultSurface;
  openCamera: (cameraId: string) => void;
  talk: ((cameraId: string) => void) | null;
  openAgenda: (at: number) => void;
  openSecurity: (() => void) | null;
  openScreen: ((result: ScreenResult) => void) | null;
  undoEvent: (result: EventMovedResult) => Promise<void>;
  undoMode: ((result: GuardModeResult) => Promise<void>) | null;
  answer: ((result: ReminderResult, accepted: boolean) => void) | null;
};

const SECOND_MS = 1000;

const seconds = (ms: number): number => Math.round(ms / SECOND_MS);

export function useResultActions(surface: ResultSurface): ResultActions {
  const router = useRouter();
  const { t } = useTranslation();
  const view = useAccessView();
  const { cameraActions, guard } = useCapabilities();

  const openScreen = (result: ScreenResult) => {
    const route = routeForScreen(result.screen, view, result.module ?? undefined);
    if (route) router.push(route);
  };

  const undoEvent = async (result: EventMovedResult) => {
    await runServiceAction({
      call: () =>
        calendarEventService.update(result.eventId, {
          startsAt: seconds(result.previousStartsAt),
          endsAt: result.previousEndsAt === null ? null : seconds(result.previousEndsAt),
        }),
      success: t('screens.voice.results.undone-event', { title: result.title }),
      errorTitle: t('screens.voice.results.undo-failed'),
    });
  };

  const undoMode = async (result: GuardModeResult) => {
    if (result.previousMode === null) return;
    const previous = result.previousMode;
    const done = await runServiceAction({
      call: () => guardService.setMode(previous, result.environmentId ?? undefined),
      success: t('screens.voice.results.undone-mode', { mode: t(GUARD_MODE_KEYS[previous]) }),
      errorTitle: t('screens.voice.results.undo-failed'),
    });
    if (done?.info) viewCacheService.writeValue(VIEW_CACHE_KEYS.guardEnvironments, done.info);
  };

  const answer = (result: ReminderResult, accepted: boolean) => {
    const words = t(accepted ? 'screens.voice.results.yes' : 'screens.voice.results.no');
    if (assistantChat.send(words) === 'sent') argusResults.answerOffer(result.id, accepted);
  };

  return {
    surface,
    openCamera: (cameraId) => router.push(`/cameras/${cameraId}`),
    talk:
      surface === 'chat' && cameraActions.talk
        ? (cameraId) => router.push(`/cameras/${cameraId}?talk=1`)
        : null,
    openAgenda: (at) => router.push(`/agenda?at=${at}`),
    openSecurity: guard.view ? () => router.push('/security') : null,
    openScreen,
    undoEvent,
    undoMode: guard.setMode ? undoMode : null,
    answer: surface === 'chat' ? answer : null,
  };
}
