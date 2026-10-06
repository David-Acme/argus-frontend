import { moduleEngine } from '@/core/services/modules';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { isJobOpen } from '@/core/services/modules/module-state';

type ModuleEnableActionProps = {
  moduleId: string;
  onEnabled?: () => void;
};

export function ModuleEnableAction({ moduleId, onEnabled }: ModuleEnableActionProps) {
  const { t } = useTranslation();
  const { has, moduleActive } = useCapabilities();
  const catalog = useModuleCatalog();
  const { run, pending } = useServiceAction();
  const module = catalog?.modules.find((candidate) => candidate.id === moduleId);
  const name = module?.name || moduleId;
  const installing = module ? isJobOpen(module.job) : false;

  if (!has(CAPABILITY.modulesManage) || moduleActive(moduleId)) return null;

  const enable = async () => {
    const result = await run({
      call: () => moduleEngine.act(moduleId, 'install'),
      errorTitle: t('screens.modules.request.enable-failed', { name }),
    });
    if (result) onEnabled?.();
  };

  return (
    <Button size="sm" className="self-start" loading={pending} disabled={installing} onPress={() => void enable()}>
      <Text>{installing ? t('screens.modules.request.enable-running') : t('screens.modules.request.enable', { name })}</Text>
    </Button>
  );
}
