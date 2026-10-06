import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useModuleRequest } from '@/features/modules/hooks/use-module-request';

type ModuleRequestButtonProps = {
  moduleId: string;
  name: string;
};

export function ModuleRequestButton({ moduleId, name }: ModuleRequestButtonProps) {
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const { request, pending, alreadyAsked } = useModuleRequest();

  if (!has(CAPABILITY.modulesRequest)) return null;

  const asked = alreadyAsked(moduleId);
  return (
    <Button
      variant="outline"
      disabled={asked}
      loading={pending === moduleId}
      onPress={() => void request(moduleId, name)}>
      <Text>{asked ? t('screens.modules.request.asked') : t('screens.modules.request.inactive')}</Text>
    </Button>
  );
}
