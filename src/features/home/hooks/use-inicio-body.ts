import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useGuardHeadline } from '@/features/security';
import { useInicioSummary } from '@/features/home/hooks/use-inicio-stats';
import { useNews } from '@/features/home/hooks/use-news';
import type { InicioSignal } from '@/features/home/model/inicio-layout';
import { firstStep, sosOnInicio, type FirstStep } from '@/features/home/model/inicio-states';
import { isSparse } from '@/features/home/model/inicio-system';
import { watchTitleOf } from '@/features/home/model/inicio-watch';

export type InicioBody = {
  signals: ReadonlySet<InicioSignal>;
  step: FirstStep | null;
  sos: boolean;
};

export function useInicioBody(): InicioBody {
  const { has, can, guard } = useCapabilities();
  const summary = useInicioSummary();
  const mode = useGuardHeadline();
  const news = useNews();
  const night = guard.view && mode === 'night';
  const signals = new Set<InicioSignal>(
    (
      [
        ['news', news.readable && news.threads.length > 0],
        ['tiles', summary.camerasTotal > 0],
        ['watch', guard.view && watchTitleOf(mode) !== null],
        ['night', night],
        ['day', !night],
        ['sparse', isSparse(summary)],
      ] as const
    )
      .filter(([, on]) => on)
      .map(([signal]) => signal)
  );
  const step = firstStep({
    summary,
    addsCameras: can('camera', 'create'),
    asksReminders: has(CAPABILITY.remindersWrite) && has(CAPABILITY.messagesRelay),
  });
  const sos = sosOnInicio({ panics: has(CAPABILITY.safetyPanic), hasSecurityTab: guard.view });
  return { signals, step, sos };
}
