import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { ModuleAction, ModuleRecord } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ModuleCard } from '@/features/modules/components/module-card';
import { ModuleCardSkeleton } from '@/features/modules/components/module-card-skeleton';
import { useModules } from '@/features/modules/hooks/use-modules';
import { UninstallDialog } from '@/features/modules/components/uninstall-dialog';
import { DisableDialog } from '@/features/modules/components/disable-dialog';
import { useModuleDisable } from '@/features/modules/hooks/use-module-disable';
import { useModuleUninstall } from '@/features/modules/hooks/use-module-uninstall';
import { lifecycleButtons } from '@/features/modules/model/module-lifecycle';
import { focusedFirst, sortModules } from '@/features/modules/model/module-selection';
import { formatMegabytes } from '@/features/modules/model/module-text';

type ModuleActionsProps = {
  module: ModuleRecord;
  pending: string | null;
  checking: string | null;
  onRun: (module: ModuleRecord, action: ModuleAction) => void;
  onDisable: (module: ModuleRecord) => void;
  onUninstall: (module: ModuleRecord) => void;
  onRetryUninstall: (module: ModuleRecord) => void;
};

type ServerFactsProps = {
  modules: readonly ModuleRecord[];
};

const columnsFor = (width: number) => (width >= 700 ? 2 : 1);

function ModuleActions({ module, pending, checking, onRun, onDisable, onUninstall, onRetryUninstall }: ModuleActionsProps) {
  const { t } = useTranslation();
  const buttons = lifecycleButtons(module);
  return (
    <>
      {buttons.map((button) => {
        const uninstall = button.action === 'uninstall';
        const disable = button.action === 'disable';
        return (
          <Button
            key={button.choice}
            size="sm"
            variant={button.tone === 'primary' ? 'default' : button.tone === 'secondary' ? 'outline' : 'ghost'}
            loading={uninstall || disable ? checking === module.id : pending === `${module.id}:${button.action}`}
            disabled={pending !== null || checking !== null}
            onPress={() =>
              button.choice === 'retry' && uninstall
                ? onRetryUninstall(module)
                : uninstall
                  ? onUninstall(module)
                  : disable
                    ? onDisable(module)
                    : onRun(module, button.action)
            }>
            <Text>{t(button.label)}</Text>
          </Button>
        );
      })}
    </>
  );
}

function ServerFacts({ modules }: ServerFactsProps) {
  const { t, language } = useTranslation();
  const hardware = modules.map((module) => module.hardware).find((value) => value !== null) ?? null;
  return (
    <>
      {hardware ? (
        <Panel title={t('screens.modules.server.title')}>
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Icon name="hard-drive" className="text-accent-strong size-5" />
              <View className="min-w-0 flex-1">
                <Text variant="caption">{t('screens.modules.server.disk')}</Text>
                <Text variant="label" className="tabular-nums">
                  {hardware.freeDiskMb === null ? '—' : formatMegabytes(hardware.freeDiskMb, language)}
                </Text>
              </View>
            </View>
            {modules
              .filter((module) => module.hardware && module.kind === 'available')
              .map((module) => (
                <View key={module.id} className="flex-row items-center gap-3">
                  <Icon name="cpu" className="text-accent-strong size-5" />
                  <View className="min-w-0 flex-1">
                    <Text variant="caption">{`${t('screens.modules.server.ram')} · ${module.name}`}</Text>
                    <Text variant="label" className="tabular-nums">
                      {t('screens.modules.server.ram-value', {
                        min: formatMegabytes(module.hardware?.minRamMb ?? 0, language),
                        recommended: formatMegabytes(module.hardware?.recommendedRamMb ?? 0, language),
                      })}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </Panel>
      ) : null}
      <Panel title={t('screens.modules.how.title')} className="flex-1">
        {(['install', 'off', 'space'] as const).map((key) => (
          <View key={key} className="flex-row gap-3">
            <Icon
              name={key === 'install' ? 'download' : key === 'off' ? 'shield-check' : 'hard-drive'}
              className="text-muted-foreground mt-0.5 size-4"
            />
            <Text variant="caption" className="text-foreground-secondary min-w-0 flex-1">
              {t(`screens.modules.how.${key}`)}
            </Text>
          </View>
        ))}
      </Panel>
    </>
  );
}

export default function ModulesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { catalog, modules, status, pending, run } = useModules();
  const uninstall = useModuleUninstall(catalog);
  const disable = useModuleDisable();
  const { module: focusId } = useLocalSearchParams<{ module?: string }>();
  const sorted = focusedFirst(sortModules(modules), focusId);
  const opened = useRef(false);
  const focused = focusId ? modules.find((module) => module.id === focusId) : undefined;
  const startUninstall = uninstall.start;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  useEffect(() => {
    if (opened.current || !focused || focused.lifecycle !== 'uninstalled_data_kept') return;
    opened.current = true;
    void startUninstall(focused);
  }, [focused, startUninstall]);

  return (
    <>
    <AppScreen
      header={<ScreenHeader title={t('screens.modules.title')} subtitle={t('screens.modules.subtitle')} onBack={back} />}
      aside={status === 'ready' ? <ServerFacts modules={modules} /> : undefined}
      fillHeight={false}>
      {status === 'ready' ? (
        <ResponsiveGrid
          id="modules-manage"
          items={sorted}
          keyOf={(module) => module.id}
          columnsFor={columnsFor}
          gap={16}
          renderItem={(module) => (
            <ModuleCard
              module={module}
              catalog={catalog}
              lifecycle
              actions={
                <ModuleActions
                  module={module}
                  pending={pending}
                  checking={uninstall.checking ?? disable.checking}
                  onRun={(target, action) => void run(target, action)}
                  onDisable={(target) => void disable.start(target)}
                  onUninstall={(target) => void uninstall.start(target)}
                  onRetryUninstall={(target) => void uninstall.retry(target)}
                />
              }
            />
          )}
        />
      ) : status === 'loading' ? (
        <View className="gap-4">
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
        </View>
      ) : (
        <View className="bg-card rounded-3xl py-6">
          <EmptyState
            variant="panel"
            icon="wifi-off"
            title={t('screens.modules.waiting-title')}
            hint={t('screens.modules.waiting-hint')}
          />
        </View>
      )}
    </AppScreen>
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
