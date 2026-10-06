import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { isJobOpen } from '@/core/services/modules';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { MODULE_SETTINGS_PATH } from '@/shared/constants';
import { useModuleCatalog } from '@/features/modules/hooks/use-module-catalog';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ModuleProgress } from '@/features/modules/components/module-progress';
import { moduleIcon } from '@/features/modules/model/module-text';

export function ModulesSummaryCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const catalog = useModuleCatalog();
  const modules = catalog?.modules ?? [];
  const active = modules.filter((module) => module.enabled || module.kind === 'core');
  const installing = modules.find((module) => isJobOpen(module.job));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('screens.modules.summary.title')}. ${t('screens.modules.summary.hint')}`}
      onPress={() => router.push(MODULE_SETTINGS_PATH)}
      className="bg-card gap-3 rounded-3xl p-4 shadow-md shadow-black/[0.05] active:opacity-90">
      <View className="flex-row items-center gap-3">
        <View className="bg-accent-soft size-10 items-center justify-center rounded-xl">
          <Icon name="blocks" className="text-accent-strong size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="subhead">{t('screens.modules.summary.title')}</Text>
          <Text variant="caption" numberOfLines={2}>
            {t('screens.modules.summary.hint')}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text variant="label" className="text-foreground-secondary">
            {t('screens.modules.summary.manage')}
          </Text>
          <Icon name="chevron-right" className="text-muted-foreground size-4" />
        </View>
      </View>
      {active.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-2">
          {active.map((module) => (
            <View key={module.id} className="bg-surface-secondary flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
              <Icon name={moduleIcon(module.id)} className="text-foreground-secondary size-3.5" />
              <Text variant="micro" className="text-foreground-secondary">
                {module.name || t('screens.modules.core-name')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {installing?.job ? <ModuleProgress job={installing.job} /> : null}
    </Pressable>
  );
}
