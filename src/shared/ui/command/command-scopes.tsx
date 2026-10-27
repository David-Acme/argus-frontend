import { ScrollView, View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { FilterChip } from '@/shared/ui/chip';
import type { CommandScopes as CommandScopesValue } from './command-types';

export type CommandScopesProps = { scopes: CommandScopesValue };

export function CommandScopes({ scopes }: CommandScopesProps) {
  const { t } = useTranslation();
  return (
    <View
      role="tablist"
      aria-label={t('common.overlay.command-scopes')}
      className="border-line border-b">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-palette-query-x py-palette-group gap-segment-gap">
        {scopes.options.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            size="view"
            selected={option.key === scopes.value}
            onPress={() => scopes.onChange(option.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
