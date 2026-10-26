import { moduleEngine } from '@/core/services/modules';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { isJobOpen } from '@/core/services/modules/module-state';

type ModuleEnableActionProps = {
  moduleId: string;
  onDone?: () => void;
};

export function ModuleEnableAction({ moduleId, onDone }: ModuleEnableActionProps) {
  const { t } = useTranslation();
  const { has, moduleActive } = useCapabilities();
  const catalog = useModuleCatalog();
  const { run } = useServiceAction();
  const module = catalog?.modules.find((candidate) => candidate.id === moduleId);
  const name = module?.name || moduleId;
  const installing = module ? isJobOpen(module.job) : false;

  if (!has(CAPABILITY.modulesManage) || moduleActive(moduleId)) return null;

  const enable = async () => {
    const result = await run({
      call: () => moduleEngine.act(moduleId, 'install'),
      errorTitle: t('screens.modules.request.enable-failed', { name }),
    });
    if (result) onDone?.();
  };

  return (
    <>
      <Button
        compact
        variant="primary"
        label={installing ? t('screens.modules.request.enable-running') : t('screens.modules.request.enable')}
        disabled={installing}
        onPress={enable}
      />
      {installing ? null : <Button compact label={t('screens.modules.later')} onPress={() => onDone?.()} />}
    </>
  );
}
