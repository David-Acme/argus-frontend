import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { useGettingStarted } from '@/features/modules/hooks/use-getting-started';
import type { ChecklistItem } from '@/features/modules/model/getting-started';
import { moduleIcon } from '@/features/modules/model/module-text';

export function GettingStartedCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { items, visible, complete, dismiss } = useGettingStarted();
  if (!visible) return null;
  const done = items.filter((item) => item.done).length;

  const open = (item: ChecklistItem) => {
    complete(item);
    if (item.route) router.push(item.route as Href);
  };

  return (
    <View className="bg-card gap-3 rounded-3xl p-4 shadow-md shadow-black/[0.05]">
      <View className="flex-row items-center gap-3">
        <View className="bg-accent-soft size-10 items-center justify-center rounded-xl">
          <Icon name="list-checks" className="text-accent-strong size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="subhead">{t('screens.modules.getting-started.title')}</Text>
          <Text variant="caption" className="tabular-nums">
            {t('screens.modules.getting-started.progress', { done: String(done), total: String(items.length) })}
          </Text>
        </View>
        <Button size="sm" variant="ghost" onPress={dismiss}>
          <Text>{t('screens.modules.getting-started.dismiss')}</Text>
        </Button>
      </View>
      <View className="bg-surface-secondary dark:bg-border h-1.5 overflow-hidden rounded-full">
        <View className="bg-accent h-full rounded-full" style={{ width: `${(done / Math.max(1, items.length)) * 100}%` }} />
      </View>
      <View className="gap-1">
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ checked: item.done }}
            accessibilityLabel={item.title}
            accessibilityHint={item.route ? undefined : t('screens.modules.getting-started.mark-done')}
            onPress={() => open(item)}
            className="flex-row items-center gap-3 rounded-xl px-2 py-2.5 active:bg-surface-secondary">
            <Icon
              name={item.done ? 'check-circle' : 'circle'}
              className={cn('size-5', item.done ? 'text-success' : 'text-muted-foreground')}
            />
            <View className="min-w-0 flex-1">
              <Text variant="label" className={item.done ? 'text-muted-foreground line-through' : undefined}>
                {item.title}
              </Text>
              {item.hint ? (
                <Text variant="caption" numberOfLines={2}>
                  {item.hint}
                </Text>
              ) : null}
            </View>
            <Icon name={item.route ? 'chevron-right' : moduleIcon(item.moduleId)} className="text-muted-foreground size-4" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
