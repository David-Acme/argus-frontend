import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useGuardHeadline } from '@/features/security';
import { useInicioSummary } from '@/features/home/hooks/use-inicio-stats';
import { useNews } from '@/features/home/hooks/use-news';
import type { InicioReads } from '@/features/home/model/inicio-layout';
import { firstStep, sosOnInicio, type FirstStep } from '@/features/home/model/inicio-states';
import { isSparse } from '@/features/home/model/inicio-system';
import { watchTitleOf } from '@/features/home/model/inicio-watch';

export type InicioBody = { reads: InicioReads; step: FirstStep | null; sos: boolean };

export function useInicioBody(): InicioBody {
  const { has, can, guard } = useCapabilities();
  const summary = useInicioSummary();
  const mode = useGuardHeadline();
  const news = useNews();
  const reads: InicioReads = {
    agenda: has(CAPABILITY.remindersRead) || has(CAPABILITY.agendaRead),
    news: news.readable && news.threads.length > 0,
    cameras: has(CAPABILITY.cameraView),
    people: has(CAPABILITY.presenceRead),
    watch: guard.view && watchTitleOf(mode) !== null,
    night: guard.view && mode === 'night',
    system: has(CAPABILITY.modulesRead) || has(CAPABILITY.cameraView),
    sparse: isSparse(summary),
  };
  const step = firstStep({
    summary,
    addsCameras: can('camera', 'create'),
    addsReminders: has(CAPABILITY.remindersWrite),
  });
  const sos = sosOnInicio({ panics: has(CAPABILITY.safetyPanic), hasSecurityTab: guard.view });
  return { reads, step, sos };
}
