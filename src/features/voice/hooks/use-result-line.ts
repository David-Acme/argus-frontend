import type { TranslateFn } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { IconGlyph } from '@/shared/ui/icon';
import {
  GUARD_MODE_KEYS,
  MODULE_NAME_KEYS,
  RESULT_ICONS,
  SCREEN_NAME_KEYS,
} from '@/features/voice/constants/result.constant';
import { useResultWhen } from '@/features/voice/hooks/use-result-when';
import type { ResultWhen } from '@/features/voice/hooks/use-result-when';
import type { ArgusResult, ScreenResult } from '@/features/voice/model/argus-result';

export type ResultLine = { title: string; icon: IconGlyph };

function screenTitle(result: ScreenResult, t: TranslateFn): string {
  const moduleKey = result.module ? MODULE_NAME_KEYS[result.module] : undefined;
  if (moduleKey) return t('screens.voice.results.module-off', { module: t(moduleKey) });
  const screenKey = SCREEN_NAME_KEYS[result.screen];
  return t('screens.voice.results.open-screen', {
    screen: screenKey ? t(screenKey) : result.screen,
  });
}

function titleOf(result: ArgusResult, t: TranslateFn, when: ResultWhen): string {
  switch (result.kind) {
    case 'camera':
      return result.name
        ? t('screens.voice.results.camera-shown', { name: result.name })
        : t('screens.voice.results.camera-any');
    case 'screen':
      return screenTitle(result, t);
    case 'reminder':
      return t('screens.voice.results.line-reminder', { title: result.title });
    case 'event-moved':
      return t('screens.voice.results.line-event', { title: result.title });
    case 'guard-mode':
      return t('screens.voice.results.mode-title', { mode: t(GUARD_MODE_KEYS[result.mode]) });
    case 'agenda-day':
      return t('screens.voice.results.line-agenda', { day: when.dayOf(result.day).toLowerCase() });
  }
}

export function useResultLine(now: number): (result: ArgusResult) => ResultLine {
  const { t } = useTranslation();
  const when = useResultWhen(now);
  return (result) => ({ title: titleOf(result, t, when), icon: RESULT_ICONS[result.kind] });
}
