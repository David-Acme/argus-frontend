import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { introFor } from '@/core/services/modules/module-text';
import type { ModuleRecord } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type ModuleIntroProps = {
  module: Pick<ModuleRecord, 'intro' | 'summary'>;
};

export function ModuleIntro({ module }: ModuleIntroProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const intro = introFor(module, language);
  const what = intro?.what || module.summary;
  const examples = intro?.examples ?? [];

  if (!what && examples.length === 0) return null;

  return (
    <View className="gap-1.5">
      {what ? (
        <Text variant="caption" className="text-foreground-secondary">
          {what}
        </Text>
      ) : null}
      {examples.length > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            hitSlop={8}
            onPress={() => setOpen((value) => !value)}
            className="min-h-8 flex-row items-center gap-1 self-start active:opacity-70">
            <Text variant="label" className="text-accent-strong">
              {open ? t('screens.modules.intro.less') : t('screens.modules.intro.more')}
            </Text>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} className="text-accent-strong size-4" />
          </Pressable>
          {open ? (
            <View className="gap-1.5">
              {examples.map((example) => (
                <View key={example} className="flex-row items-start gap-2">
                  <Icon name="check" className="text-success mt-0.5 size-3.5" />
                  <Text variant="caption" className="min-w-0 flex-1">
                    {example}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
