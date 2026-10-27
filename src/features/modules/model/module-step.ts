import type { LanguageCode, ModuleCatalog, TranslateFn } from '@/core/types';
import { isChoosable, sortModules } from '@/features/modules/model/module-selection';
import { formatBytes, hardwareReasonText } from '@/features/modules/model/module-text';

export type ModuleStepCard = {
  id: string;
  name: string;
  summary: string;
  note: string;
  selected: boolean;
  selectable: boolean;
};

export type ModuleStepInput = {
  catalog: ModuleCatalog | null;
  selection: readonly string[];
  language: LanguageCode;
  t: TranslateFn;
};

export function moduleStepCards({
  catalog,
  selection,
  language,
  t,
}: ModuleStepInput): ModuleStepCard[] {
  return sortModules(catalog?.modules ?? [])
    .filter((module) => module.kind === 'available')
    .map((module) => {
      const remaining = Math.max(0, module.sizeBytes - module.installedBytes);
      const hardware = module.hardware;
      const reason =
        hardware && hardware.verdict !== 'ok'
          ? hardware.reasons
              .map((code) => hardwareReasonText(code, hardware, language, t))
              .find(Boolean)
          : undefined;
      const size =
        module.enabled || remaining === 0
          ? t('screens.modules.step-note.ready')
          : t('screens.modules.step-note.download', { size: formatBytes(remaining, language) });
      const note = reason ?? size;
      return {
        id: module.id,
        name: module.name || module.id,
        summary: module.summary,
        note,
        selected: module.enabled || selection.includes(module.id),
        selectable: isChoosable(module),
      };
    });
}
