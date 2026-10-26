import { useRouter } from 'expo-router';
import { MODULE_SETTINGS_PATH } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { ModuleDialogs, ModuleStateRow } from '@/features/modules/components/module-rows';
import { useModuleSwitches } from '@/features/modules/hooks/use-module-switches';
import { sortModules } from '@/features/modules/model/module-selection';

export function ModulesSwitchSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const switches = useModuleSwitches();
  const modules = sortModules(switches.modules).filter((module) => module.kind === 'available');
  return (
    <>
      <Section title={t('screens.modules.title')}>
        {modules.map((module) => (
          <ModuleStateRow key={module.id} module={module} switches={switches} />
        ))}
        <Row
          leading={<Avatar icon="grid" />}
          title={t('screens.modules.manage-title')}
          meta={t('screens.modules.manage-meta')}
          chevron
          onPress={() => router.push(MODULE_SETTINGS_PATH)}
        />
      </Section>
      <ModuleDialogs switches={switches} />
    </>
  );
}
