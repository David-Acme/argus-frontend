import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { moduleGlyph } from '@/features/modules/constants/module-look.constant';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { useModuleRequest } from '@/features/modules/hooks/use-module-request';
import { requestableModules } from '@/features/modules/model/module-request';

export function ModuleRequestsSection() {
  const { t } = useTranslation();
  const { has, roleActive } = useCapabilities();
  const catalog = useModuleCatalog();
  const { request, pending, alreadyAsked, hidden } = useModuleRequest();
  const modules = requestableModules(catalog?.modules ?? [], hidden);

  if (!roleActive || !has(CAPABILITY.modulesRequest)) return null;
  if (modules.length === 0)
    return (
      <Section variant="plain">
        <Notice icon="check" title={t('screens.modules.request.none')} />
      </Section>
    );

  return (
    <Section title={t('screens.modules.request.title')}>
      {modules.map((module) => {
        const asked = alreadyAsked(module.id);
        const name = module.name || module.id;
        return (
          <Row
            key={module.id}
            leading={<Avatar icon={moduleGlyph(module.id)} />}
            title={name}
            meta={module.summary || t('screens.modules.request.hint')}
            trailing={
              <Button
                compact
                variant={asked ? 'secondary' : 'primary'}
                label={
                  asked ? t('screens.modules.request.asked') : t('screens.modules.request.ask')
                }
                disabled={asked}
                busy={pending === module.id}
                onPress={() => request(module.id, name)}
              />
            }
          />
        );
      })}
    </Section>
  );
}
