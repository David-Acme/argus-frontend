import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ModuleIntro } from '@/features/modules/components/module-intro';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { useModuleRequest } from '@/features/modules/hooks/use-module-request';
import { requestableModules } from '@/features/modules/model/module-request';
import { moduleIcon } from '@/features/modules/model/module-text';

type ModuleRequestsSectionProps = {
  className?: string;
};

export function ModuleRequestsSection({ className }: ModuleRequestsSectionProps) {
  const { t } = useTranslation();
  const { has, roleActive } = useCapabilities();
  const catalog = useModuleCatalog();
  const { request, pending, alreadyAsked, hidden } = useModuleRequest();
  const modules = requestableModules(catalog?.modules ?? [], hidden);

  if (!roleActive || !has(CAPABILITY.modulesRequest) || modules.length === 0) return null;

  return (
    <Panel className={className} title={t('screens.modules.request.title')} description={t('screens.modules.request.hint')}>
      {modules.map((module) => {
        const asked = alreadyAsked(module.id);
        const name = module.name || module.id;
        return (
          <View key={module.id} className="flex-row items-start gap-3">
            <View className="bg-surface-secondary size-10 items-center justify-center rounded-xl">
              <Icon name={moduleIcon(module.id)} className="text-foreground-secondary size-5" />
            </View>
            <View className="min-w-0 flex-1 gap-1.5">
              <Text variant="subhead" className="font-semibold">
                {name}
              </Text>
              <ModuleIntro module={module} />
              <Button
                size="sm"
                variant={asked ? 'outline' : 'default'}
                className="self-start"
                disabled={asked}
                loading={pending === module.id}
                onPress={() => void request(module.id, name)}>
                <Text>{asked ? t('screens.modules.request.asked') : t('screens.modules.request.ask')}</Text>
              </Button>
            </View>
          </View>
        );
      })}
    </Panel>
  );
}
