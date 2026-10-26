import { CAPABILITY, MODULE_IDS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useInicioSummary } from '@/features/home/hooks/use-inicio-stats';
import { namesText } from '@/features/home/model/inicio-hero';
import { systemRows, type SystemRow } from '@/features/home/model/inicio-system';

type SystemLineProps = { row: SystemRow };

function SystemLine({ row }: SystemLineProps) {
  const { t } = useTranslation();
  if (row.kind === 'modules') {
    const names = namesText(row.names, t);
    return (
      <Row
        leading={<Avatar icon="grid" />}
        title={t('screens.home.inicio.system.modules')}
        meta={
          row.names.length === 1
            ? t('screens.home.inicio.system.modules-one', { names })
            : t('screens.home.inicio.system.modules-on', { names })
        }
      />
    );
  }
  return (
    <Row
      leading={<Avatar icon="cam" />}
      title={t('screens.home.inicio.system.cameras')}
      meta={
        row.kind === 'cameras'
          ? t('screens.home.inicio.system.cameras-online', {
              online: String(row.online),
              total: String(row.total),
            })
          : t('screens.home.inicio.system.no-cameras')
      }
    />
  );
}

export function SystemSection() {
  const { t } = useTranslation();
  const { has, activeModules, moduleNames } = useCapabilities();
  const summary = useInicioSummary();
  const rows = systemRows({
    modules: has(CAPABILITY.modulesRead)
      ? [...activeModules]
          .filter((id) => id !== MODULE_IDS.core)
          .flatMap((id) => moduleNames.get(id) ?? [])
      : null,
    cameras: has(CAPABILITY.cameraView) ? summary : null,
  });
  if (rows.length === 0) return null;
  return (
    <Section title={t('screens.home.inicio.system.title')}>
      {rows.map((row) => (
        <SystemLine key={row.kind} row={row} />
      ))}
    </Section>
  );
}
