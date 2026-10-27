import { View } from 'react-native';
import type { ModuleRecord } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Meter } from '@/shared/ui/meter';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { DisableDialog } from '@/features/modules/components/disable-dialog';
import { UninstallDialog } from '@/features/modules/components/uninstall-dialog';
import { LIFECYCLE_LABEL, moduleGlyph } from '@/features/modules/constants/module-look.constant';
import type { ModuleSwitches } from '@/features/modules/hooks/use-module-switches';
import { lifecycleButtons, lifecycleCopy } from '@/features/modules/model/module-lifecycle';
import { moduleBusy, moduleDangerOf, moduleSwitchOf } from '@/features/modules/model/module-switch';
import { unmetRequirements } from '@/features/modules/model/module-selection';
import {
  failureText,
  formatBytes,
  moduleNames,
  progressLine,
  verdictKey,
} from '@/features/modules/model/module-text';

type ModuleProps = { module: ModuleRecord; switches: ModuleSwitches };

type HeadProps = ModuleProps & { meta: string };

type DialogsProps = { switches: ModuleSwitches };

function useStateLine(module: ModuleRecord): string {
  const { t, language } = useTranslation();
  if (module.kind === 'core') return t('screens.modules.included');
  if (module.kind === 'coming_soon') return t('screens.modules.coming-soon');
  if (module.job && module.job.state !== 'done' && module.job.state !== 'cancelled')
    return module.job.state === 'failed'
      ? failureText(module.job.reason, module.job.owner, t)
      : progressLine(module.job, language, t);
  const state = t(LIFECYCLE_LABEL[module.lifecycle]);
  if (module.lifecycle === 'active' && module.installedBytes > 0)
    return `${state} · ${t('screens.modules.on-server', { size: formatBytes(module.installedBytes, language) })}`;
  if (module.lifecycle === 'not_installed' && module.hardware)
    return `${state} · ${t(verdictKey(module.hardware.verdict))}`;
  return state;
}

function useDetail(module: ModuleRecord, switches: ModuleSwitches): string | undefined {
  const { t } = useTranslation();
  const requires = unmetRequirements(switches.catalog, module);
  if (requires.length > 0)
    return t('screens.modules.requires', { names: moduleNames(requires, switches.modules, t) });
  const hint = module.kind === 'available' ? lifecycleCopy(module.lifecycle).hint : null;
  return hint ? t(hint) : undefined;
}

export function ModuleHeadRow({ module, switches, meta }: HeadProps) {
  const { t } = useTranslation();
  const state = moduleSwitchOf(module);
  const name = module.name || t('screens.modules.core-name');
  return (
    <Row
      leading={
        <Avatar icon={moduleGlyph(module.id)} tone={module.enabled ? 'accent' : 'default'} />
      }
      title={name}
      meta={meta}
      trailing={
        state.kind === 'switch' ? (
          <Switch
            label={name}
            value={state.on}
            disabled={state.move === null || switches.busy(module)}
            onValueChange={() => switches.toggle(module)}
            testID={`module-switch-${module.id}`}
          />
        ) : undefined
      }
    />
  );
}

function JobRow({ module, switches }: ModuleProps) {
  const { t } = useTranslation();
  const job = module.job;
  if (!job || !moduleBusy(module)) return null;
  const name = module.name || module.id;
  return (
    <View className="px-row-x py-row-y gap-3">
      <Meter fraction={job.progress} label={name} />
      <View className="flex-row flex-wrap justify-end gap-2">
        {lifecycleButtons(module).map((button) => (
          <Button
            key={button.choice}
            compact
            variant={button.tone === 'primary' ? 'primary' : 'secondary'}
            label={t(button.label)}
            busy={switches.pending === `${module.id}:${button.action}`}
            onPress={() => switches.runJob(module, button)}
          />
        ))}
      </View>
    </View>
  );
}

export function ModuleSection({ module, switches }: ModuleProps) {
  const { t } = useTranslation();
  const state = useStateLine(module);
  const detail = useDetail(module, switches);
  const danger = moduleDangerOf(module);
  return (
    <Section testID={`module-${module.id}`}>
      <ModuleHeadRow module={module} switches={switches} meta={module.summary || state} />
      {module.summary ? <Row title={state} meta={detail} /> : null}
      <JobRow module={module} switches={switches} />
      {danger ? (
        <Row
          danger
          title={t(
            danger === 'erase'
              ? 'screens.modules.actions.erase-named'
              : 'screens.modules.actions.uninstall-named',
            { name: module.name || t('screens.modules.core-name') }
          )}
          meta={t(
            danger === 'erase'
              ? 'screens.modules.lifecycle.uninstalled-hint'
              : 'screens.modules.danger-meta'
          )}
          onPress={() => switches.removeData(module)}
        />
      ) : null}
    </Section>
  );
}

export function ModuleStateRow({ module, switches }: ModuleProps) {
  const state = useStateLine(module);
  return <ModuleHeadRow module={module} switches={switches} meta={state} />;
}

export function ModuleDialogs({ switches }: DialogsProps) {
  const { uninstall, disable } = switches;
  return (
    <>
      <DisableDialog
        target={disable.target}
        busy={disable.busy}
        onClose={disable.close}
        onConfirm={() => void disable.confirm()}
      />
      <UninstallDialog
        key={uninstall.target ? `${uninstall.target.module.id}:${uninstall.target.mode}` : 'closed'}
        target={uninstall.target}
        onClose={uninstall.close}
        onSubmit={(keepData, choices) => void uninstall.submit(keepData, choices)}
      />
    </>
  );
}
