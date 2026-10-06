import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { isJobOpen } from '@/core/services/modules/module-state';
import type { ModuleCatalog, ModuleRecord } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { HostCommandNote } from '@/features/modules/components/host-command-note';
import { ModuleIntro } from '@/features/modules/components/module-intro';
import { ModuleProgress } from '@/features/modules/components/module-progress';
import { lifecycleCopy } from '@/features/modules/model/module-lifecycle';
import { unmetRequirements } from '@/features/modules/model/module-selection';
import {
  failureText,
  formatBytes,
  hardwareReasonText,
  hostCommands,
  moduleIcon,
  moduleNames,
  moduleStatus,
  verdictKey,
} from '@/features/modules/model/module-text';

type ModuleCardProps = {
  module: ModuleRecord;
  catalog: ModuleCatalog | null;
  selected?: boolean;
  selectable?: boolean;
  recommended?: boolean;
  addedBy?: string | null;
  lifecycle?: boolean;
  intro?: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
  className?: string;
};

const VERDICT_DOT: Readonly<Record<string, string>> = {
  ok: 'bg-success',
  slow: 'bg-warning',
  insufficient: 'bg-error',
};

export function ModuleCard({
  module,
  catalog,
  selected = false,
  selectable = false,
  recommended = false,
  addedBy = null,
  lifecycle = false,
  intro = false,
  onToggle,
  actions,
  className,
}: ModuleCardProps) {
  const { t, language } = useTranslation();
  const status = moduleStatus(module);
  const muted = status === 'coming-soon' || status === 'blocked';
  const hardware = module.hardware;
  const reasons = hardware
    ? hardware.reasons.map((reason) => hardwareReasonText(reason, hardware, language, t)).filter(Boolean)
    : [];
  const requires = unmetRequirements(catalog, module);
  const commands = hostCommands(module);
  const stage = module.kind === 'available' ? lifecycleCopy(module.lifecycle) : null;
  const remaining = Math.max(0, module.sizeBytes - module.installedBytes);
  const size =
    module.kind === 'coming_soon'
      ? null
      : module.enabled || status === 'core'
        ? module.installedBytes > 0
          ? t('screens.modules.on-server', { size: formatBytes(module.installedBytes, language) })
          : null
        : remaining > 0
          ? formatBytes(remaining, language)
          : t('screens.modules.no-download');

  const badge =
    status === 'core'
      ? { label: t('screens.modules.included'), icon: 'check' as const }
      : status === 'coming-soon'
        ? { label: t('screens.modules.coming-soon'), icon: 'clock' as const }
        : status === 'enabled' && !lifecycle
          ? { label: t('screens.modules.active'), icon: 'check-circle' as const }
          : selectable && recommended
            ? { label: t('screens.modules.recommended'), icon: 'sparkles' as const }
            : null;

  const body = (
    <View
      className={cn(
        'bg-card gap-3 rounded-3xl border-2 p-4 shadow-md shadow-black/[0.05]',
        selected ? 'border-accent' : 'border-transparent',
        muted ? 'opacity-70' : null,
        className
      )}>
      <View className="flex-row items-start gap-3">
        <View
          className={cn(
            'size-12 items-center justify-center rounded-2xl',
            status === 'enabled' || status === 'core' || selected ? 'bg-accent-soft' : 'bg-surface-secondary'
          )}>
          <Icon
            name={moduleIcon(module.id)}
            className={cn(
              'size-6',
              status === 'enabled' || status === 'core' || selected ? 'text-accent-strong' : 'text-foreground-secondary'
            )}
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="subhead" className="font-semibold" numberOfLines={1}>
              {module.name || module.id}
            </Text>
            {badge ? <StatusBadge label={badge.label} icon={badge.icon} /> : null}
          </View>
          {intro ? (
            <ModuleIntro module={module} />
          ) : module.summary ? (
            <Text variant="caption" className="text-foreground-secondary" numberOfLines={3}>
              {module.summary}
            </Text>
          ) : null}
        </View>
        {selectable ? (
          <View
            className={cn(
              'size-7 items-center justify-center rounded-full border-2',
              selected ? 'bg-accent border-accent' : 'border-border'
            )}>
            {selected ? <Icon name="check" className="text-foreground-on-interactive size-4" /> : null}
          </View>
        ) : null}
      </View>

      {stage && (lifecycle || stage.hint) && !isJobOpen(module.job) ? (
        <View className="gap-0.5">
          {lifecycle ? (
            <View className="flex-row items-center gap-1.5">
              <View
                className={cn(
                  'size-2 rounded-full',
                  module.lifecycle === 'active' ? 'bg-success' : module.lifecycle === 'not_installed' ? 'bg-border' : 'bg-warning'
                )}
              />
              <Text variant="label">{t(stage.label)}</Text>
            </View>
          ) : null}
          {stage.hint ? <Text variant="caption">{t(stage.hint)}</Text> : null}
        </View>
      ) : null}

      {status !== 'coming-soon' && (size || hardware) ? (
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
          {size ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="hard-drive" className="text-muted-foreground size-3.5" />
              <Text variant="caption" className="tabular-nums">
                {size}
              </Text>
            </View>
          ) : null}
          {hardware && !module.enabled && status !== 'core' ? (
            <View className="flex-row items-center gap-1.5">
              <View className={cn('size-2 rounded-full', VERDICT_DOT[hardware.verdict])} />
              <Text
                variant="caption"
                className={hardware.verdict === 'insufficient' ? 'text-error-strong' : 'text-foreground-secondary'}>
                {t(verdictKey(hardware.verdict))}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {reasons.length > 0 && !module.enabled ? (
        <View className="gap-0.5">
          {reasons.map((reason) => (
            <Text key={reason} variant="caption">
              {reason}
            </Text>
          ))}
        </View>
      ) : null}

      {addedBy ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="link" className="text-accent-strong size-3.5" />
          <Text variant="caption" className="text-foreground-secondary">
            {t('screens.modules.needed-by', { names: addedBy })}
          </Text>
        </View>
      ) : requires.length > 0 && status !== 'coming-soon' ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="link" className="text-muted-foreground size-3.5" />
          <Text variant="caption">
            {t('screens.modules.requires', { names: moduleNames(requires, catalog?.modules ?? [], t) })}
          </Text>
        </View>
      ) : null}

      {module.job && module.job.state !== 'done' && module.job.state !== 'cancelled' ? (
        <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl p-3">
          <ModuleProgress job={module.job} />
          {module.job.state === 'failed' ? (
            <Text variant="caption" className="text-error-strong">
              {failureText(module.job.reason, module.job.owner, t)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {commands.length > 0 ? <HostCommandNote commands={commands} /> : null}

      {actions ? <View className="flex-row flex-wrap items-center justify-end gap-2">{actions}</View> : null}
    </View>
  );

  if (!selectable || !onToggle) return body;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${module.name}. ${module.summary}`}
      onPress={onToggle}
      className="active:opacity-90">
      {body}
    </Pressable>
  );
}
