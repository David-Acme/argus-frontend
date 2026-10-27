import { useState } from 'react';
import { moduleEngine } from '@/core/services/modules';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { useModules } from '@/features/modules/hooks/use-modules';
import type { ModuleListStatus } from '@/features/modules/hooks/use-modules';
import {
  defaultSelection,
  selectionSummary,
  toggleModule,
} from '@/features/modules/model/module-selection';
import { moduleStepCards } from '@/features/modules/model/module-step';
import type { ModuleStepCard } from '@/features/modules/model/module-step';
import { moduleNames } from '@/features/modules/model/module-text';

export type ModuleStep = {
  status: ModuleListStatus;
  cards: ModuleStepCard[];
  fits: boolean;
  toggle: (id: string) => void;
  start: () => Promise<void>;
};

export function useModuleStep(onNext: () => void): ModuleStep {
  const { t, language } = useTranslation();
  const { catalog, modules, status } = useModules();
  const [touched, setTouched] = useState<string[] | null>(null);
  const selection = touched ?? defaultSelection(catalog);
  const summary = selectionSummary(catalog, selection);

  const start = async () => {
    const refused: string[] = [];
    for (const id of summary.plan.order) {
      const result = await moduleEngine.act(id, 'install');
      if (!result.ok && result.errors?.code !== 'MODULE_JOB_RUNNING') refused.push(id);
    }
    if (refused.length > 0)
      toast.warning(t('screens.modules.start-failed', { names: moduleNames(refused, modules, t) }));
    onNext();
  };

  return {
    status,
    cards: moduleStepCards({ catalog, selection, language, t }),
    fits: summary.fits,
    toggle: (id) => setTouched(toggleModule(catalog, selection, id)),
    start,
  };
}
