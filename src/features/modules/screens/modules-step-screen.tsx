import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moduleEngine } from '@/core/services/modules';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { toast } from '@/shared/libs/toast';
import { cn } from '@/shared/libs/utils';
import { ModuleCard } from '@/features/modules/components/module-card';
import { ModuleCardSkeleton } from '@/features/modules/components/module-card-skeleton';
import { useModules } from '@/features/modules/hooks/use-modules';
import {
  addedByOf,
  defaultSelection,
  isChoosable,
  isRecommended,
  selectionSummary,
  sortModules,
  toggleModule,
} from '@/features/modules/model/module-selection';
import { formatBytes, formatMegabytes, moduleNames } from '@/features/modules/model/module-text';

type ModulesStepScreenProps = {
  header: ReactNode;
  onNext: () => void;
};

const columnsFor = (width: number) => (width >= 640 ? 2 : 1);

export function ModulesStepScreen({ header, onNext }: ModulesStepScreenProps) {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isWide } = useWindowClass();
  const { catalog, modules, status } = useModules();
  const [touched, setTouched] = useState<string[] | null>(null);
  const [starting, setStarting] = useState(false);
  const selection = touched ?? defaultSelection(catalog);
  const summary = selectionSummary(catalog, selection);
  const sorted = sortModules(modules);
  const ready = status === 'ready';

  const toggle = (id: string) => setTouched(toggleModule(catalog, selection, id));

  const start = async () => {
    if (summary.plan.order.length === 0) {
      onNext();
      return;
    }
    setStarting(true);
    const refused: string[] = [];
    for (const id of summary.plan.order) {
      const result = await moduleEngine.act(id, 'install');
      if (!result.ok && result.errors?.code !== 'MODULE_JOB_RUNNING') refused.push(id);
    }
    setStarting(false);
    if (refused.length > 0) {
      toast.warning(t('screens.modules.start-failed', { names: moduleNames(refused, modules, t) }));
    }
    onNext();
  };

  const footerLine =
    summary.plan.order.length === 0
      ? null
      : summary.bytes > 0
        ? t('screens.modules.footer-download', { size: formatBytes(summary.bytes, language) })
        : t('screens.modules.footer-none');

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 24, paddingHorizontal: 24 }}>
        <View className="w-full max-w-3xl gap-6 self-center">
          <View className="gap-3">
            {header}
            <Text variant={isWide ? 'display' : 'title'}>{t('screens.modules.step-title')}</Text>
            <Text variant="body" className="text-foreground-secondary max-w-xl">
              {t('screens.modules.step-subtitle')}
            </Text>
          </View>

          {ready ? (
            <ResponsiveGrid
              id="modules-step"
              items={sorted}
              keyOf={(module) => module.id}
              columnsFor={columnsFor}
              gap={16}
              renderItem={(module) => {
                const addedBy = addedByOf(catalog, selection, module.id);
                return (
                  <ModuleCard
                    module={module}
                    catalog={catalog}
                    selectable={isChoosable(module)}
                    selected={selection.includes(module.id)}
                    recommended={isRecommended(module)}
                    addedBy={addedBy.length > 0 ? moduleNames(addedBy, modules, t) : null}
                    onToggle={() => toggle(module.id)}
                  />
                );
              }}
            />
          ) : status === 'loading' ? (
            <View className="gap-4">
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
        </View>
      </ScrollView>

      <View
        className="border-border-subtle bg-card border-t px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <View className={cn('w-full max-w-3xl gap-3 self-center', isWide ? 'flex-row items-center' : null)}>
          <View className="min-w-0 flex-1 gap-0.5">
            {footerLine ? (
              <Text variant="label" className="tabular-nums">
                {footerLine}
              </Text>
            ) : null}
            {summary.freeDiskMb !== null && summary.plan.order.length > 0 ? (
              <Text variant="caption" className={summary.fits ? undefined : 'text-error-strong'}>
                {t('screens.modules.footer-free', { free: formatMegabytes(summary.freeDiskMb, language) })}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-1.5">
              <Icon name="lock" className="text-muted-foreground size-3.5" />
              <Text variant="caption">{t('screens.modules.background-note')}</Text>
            </View>
          </View>
          <View className={cn('gap-2', isWide ? 'flex-row-reverse items-center' : null)}>
            <Button
              size="lg"
              loading={starting}
              disabled={starting || !summary.fits}
              onPress={() => void start()}>
              <Text>
                {summary.plan.order.length > 0 ? t('screens.modules.install-continue') : t('screens.modules.continue')}
              </Text>
            </Button>
            {summary.plan.order.length > 0 ? (
              <Button variant="ghost" disabled={starting} onPress={onNext}>
                <Text>{t('screens.modules.later')}</Text>
              </Button>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
