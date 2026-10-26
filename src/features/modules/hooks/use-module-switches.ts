import type { ModuleRecord } from '@/core/types';
import { useModuleDisable } from '@/features/modules/hooks/use-module-disable';
import { useModuleUninstall } from '@/features/modules/hooks/use-module-uninstall';
import { useModules } from '@/features/modules/hooks/use-modules';
import type { LifecycleButton } from '@/features/modules/model/module-lifecycle';
import { moduleSwitchOf } from '@/features/modules/model/module-switch';

export function useModuleSwitches() {
  const modules = useModules();
  const uninstall = useModuleUninstall(modules.catalog);
  const disable = useModuleDisable();
  const checking = uninstall.checking ?? disable.checking;

  const toggle = (module: ModuleRecord) => {
    const state = moduleSwitchOf(module);
    if (state.kind !== 'switch' || state.move === null) return;
    if (state.move === 'disable') void disable.start(module);
    else void modules.run(module, 'install');
  };

  const removeData = (module: ModuleRecord) => void uninstall.start(module);

  const runJob = (module: ModuleRecord, button: LifecycleButton) => {
    if (button.choice === 'retry' && button.action === 'uninstall') void uninstall.retry(module);
    else void modules.run(module, button.action);
  };

  const busy = (module: ModuleRecord) =>
    checking === module.id || (modules.pending?.startsWith(`${module.id}:`) ?? false);

  return { ...modules, toggle, removeData, runJob, busy, uninstall, disable };
}

export type ModuleSwitches = ReturnType<typeof useModuleSwitches>;
