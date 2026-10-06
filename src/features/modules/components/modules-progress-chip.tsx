import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { isJobOpen } from '@/core/services/modules';
import { useAuthStore } from '@/core/stores';
import type { ModuleRecord } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { MODULE_SETTINGS_PATH } from '@/shared/constants';
import { useModuleCatalog } from '@/shared/hooks/use-modules';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { ModuleProgress } from '@/features/modules/components/module-progress';
import { jobLabelKey, percentOf } from '@/features/modules/model/module-text';

const attentionOf = (modules: readonly ModuleRecord[]): ModuleRecord | null =>
  modules.find((module) => module.job?.state === 'failed') ??
  modules.find((module) => isJobOpen(module.job) && module.job?.state !== 'paused') ??
  modules.find((module) => module.job?.state === 'paused') ??
  null;

export function ModulesProgressChip() {
  const router = useRouter();
  const { t } = useTranslation();
  const owner = useAuthStore((state) => state.user?.role === 'owner');
  const catalog = useModuleCatalog();
  const module = owner ? attentionOf(catalog?.modules ?? []) : null;
  const job = module?.job ?? null;
  if (!module || !job) return null;
  const failed = job.state === 'failed';
  const label = failed
    ? t('screens.modules.failed-chip', { name: module.name })
    : job.state === 'paused'
      ? t('screens.modules.paused-chip', { name: module.name })
      : t('screens.modules.installing-chip', {
        name: module.name,
        state: t(jobLabelKey(job)),
        percent: `${percentOf(job.progress)} %`,
      });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(MODULE_SETTINGS_PATH)}
      className="bg-card flex-row items-center gap-3 rounded-2xl p-3 shadow-sm shadow-black/[0.04] active:opacity-80">
      <View className={cn('size-10 items-center justify-center rounded-xl', failed ? 'bg-error/15' : 'bg-accent-soft')}>
        <Icon
          name={failed ? 'triangle-alert' : job.state === 'paused' ? 'pause' : 'download'}
          className={cn('size-5', failed ? 'text-error-strong' : 'text-accent-strong')}
        />
      </View>
      <View className="min-w-0 flex-1 gap-1.5">
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
        {failed ? null : <ModuleProgress job={job} compact />}
      </View>
      <Icon name="chevron-right" className="text-muted-foreground size-4" />
    </Pressable>
  );
}
