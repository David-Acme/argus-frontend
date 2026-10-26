import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import type { Resource } from '@/shared/ui/resource-view';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ModuleDialogs, ModuleSection } from '@/features/modules/components/module-rows';
import { useModuleSwitches } from '@/features/modules/hooks/use-module-switches';
import type { ModuleSwitches } from '@/features/modules/hooks/use-module-switches';
import { focusedFirst, sortModules } from '@/features/modules/model/module-selection';

const resourceOfModules = (switches: ModuleSwitches): Resource<ModuleSwitches['modules']> =>
  switches.status === 'ready' ? { status: 'ready', data: switches.modules } : { status: 'loading' };

export default function ModulesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const switches = useModuleSwitches();
  const { module: focusId } = useLocalSearchParams<{ module?: string }>();
  const opened = useRef(false);
  const focused = focusId ? switches.modules.find((module) => module.id === focusId) : undefined;
  const startUninstall = switches.uninstall.start;
  const copy = useResourceCopy({
    title: t('screens.modules.waiting-title'),
    body: t('screens.modules.waiting-hint'),
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  useEffect(() => {
    if (opened.current || !focused || focused.lifecycle !== 'uninstalled_data_kept') return;
    opened.current = true;
    void startUninstall(focused);
  }, [focused, startUninstall]);

  return (
    <Screen
      title={t('screens.modules.title')}
      meta={t('screens.modules.subtitle')}
      back={{ label: t('common.back'), onPress: back }}>
      {switches.status === 'waiting' ? (
        <Section variant="plain">
          <Notice
            tone="attention"
            icon="wifioff"
            title={t('screens.modules.waiting-title')}
            body={t('screens.modules.waiting-hint')}
          />
        </Section>
      ) : (
        <ResourceView
          resource={resourceOfModules(switches)}
          copy={copy}
          skeleton={
            <Section>
              <SkeletonRow trailing />
              <SkeletonRow trailing />
              <SkeletonRow trailing short />
            </Section>
          }
          empty={{
            message: t('screens.modules.waiting-title'),
            action: { label: t('common.back'), onPress: back },
          }}>
          {(modules) =>
            focusedFirst(sortModules(modules), focusId).map((module) => (
              <ModuleSection key={module.id} module={module} switches={switches} />
            ))
          }
        </ResourceView>
      )}
      <ModuleDialogs switches={switches} />
    </Screen>
  );
}
