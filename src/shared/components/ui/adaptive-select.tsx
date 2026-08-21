import * as PopoverPrimitive from '@rn-primitives/popover';
import { useMemo, useState, type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useUniwind } from 'uniwind';
import type { MenuOption } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { OptionRow } from '@/shared/components/ui/option-row';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/shared/components/ui/sheet';
import { Text } from '@/shared/components/ui/text';
import { colorTokens } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type AdaptiveSelectProps<T extends string = string> = {
  options: readonly MenuOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  trigger: ReactNode;
  title: string;
  closeLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  /** Below this many options the filter field is hidden as noise. */
  filterThreshold?: number;
  contentClassName?: string;
};

type SelectListProps = {
  options: readonly MenuOption[];
  value?: string;
  showFilter: boolean;
  searchPlaceholder: string;
  emptyLabel: string;
  density: 'comfortable' | 'compact';
  onChoose: (value: string) => void;
};

const LIST_MAX_HEIGHT = 360;
const DEFAULT_FILTER_THRESHOLD = 7;

function matches(option: MenuOption, query: string): boolean {
  if (query.length === 0) return true;
  const needle = query.trim().toLowerCase();
  return (
    option.label.toLowerCase().includes(needle) ||
    (option.description?.toLowerCase().includes(needle) ?? false)
  );
}

/** Filter field + rows. Shared so the popover and the sheet cannot drift. */
function SelectList({
  options,
  value,
  showFilter,
  searchPlaceholder,
  emptyLabel,
  density,
  onChoose,
}: SelectListProps) {
  const { theme } = useUniwind();
  const [query, setQuery] = useState('');
  const placeholderColor = colorTokens[theme === 'dark' ? 'dark' : 'light'].placeholder;
  const visible = useMemo(
    () => options.filter((option) => matches(option, query)),
    [options, query]
  );

  return (
    <>
      {showFilter ? (
        <View className="bg-surface-secondary flex-row items-center gap-2 rounded-full px-4">
          <Icon name="search" className="text-muted-foreground size-4" />
          <Input
            className="h-11 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none"
            placeholder={searchPlaceholder}
            placeholderTextColor={placeholderColor}
            accessibilityLabel={searchPlaceholder}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      ) : null}
      <ScrollView
        style={{ maxHeight: LIST_MAX_HEIGHT }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="gap-0.5 pb-1">
          {visible.length > 0 ? (
            visible.map((option) => (
              <OptionRow
                key={option.value}
                option={option}
                selected={option.value === value}
                onSelect={onChoose}
                density={density}
              />
            ))
          ) : (
            <View className="items-center py-6">
              <Text className="text-muted-foreground text-[13px]">{emptyLabel}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

/** Popover body: needs the root context to close itself after a pick. */
function PopoverBody({
  onPicked,
  ...listProps
}: Omit<SelectListProps, 'onChoose'> & { onPicked: (value: string) => void }) {
  const { onOpenChange } = PopoverPrimitive.useRootContext();

  return (
    <SelectList
      {...listProps}
      onChoose={(next) => {
        onOpenChange(false);
        onPicked(next);
      }}
    />
  );
}

/**
 * Pick-one with a filter: a combobox under a pointer, a sheet with a search
 * field on phones. The sheet rides the keyboard (see SheetContent), so the list
 * stays visible while typing instead of being covered — which is the whole
 * reason a phone gets a sheet rather than a floating popover.
 */
export function AdaptiveSelect<T extends string = string>({
  options,
  value,
  onChange,
  trigger,
  title,
  closeLabel,
  searchPlaceholder,
  emptyLabel,
  filterThreshold = DEFAULT_FILTER_THRESHOLD,
  contentClassName,
}: AdaptiveSelectProps<T>) {
  const { isCompact } = useWindowClass();
  const [open, setOpen] = useState(false);
  const showFilter = options.length >= filterThreshold;

  function choose(next: string) {
    setOpen(false);
    onChange(next as T);
  }

  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className={contentClassName}>
          <SheetHeader title={title} closeLabel={closeLabel} />
          <SelectList
            options={options}
            value={value}
            showFilter={showFilter}
            searchPlaceholder={searchPlaceholder}
            emptyLabel={emptyLabel}
            density="comfortable"
            onChoose={choose}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Overlay className={cn('z-50', Platform.select({ web: 'fixed inset-0' }))}>
          <PopoverPrimitive.Content
            insets={{ left: 12, right: 12 }}
            className={cn(
              'bg-card z-50 w-72 gap-2 rounded-[18px] p-2 shadow-lg shadow-black/15',
              Platform.select({ web: 'animate-in fade-in-0 zoom-in-95 origin-top' }),
              contentClassName
            )}>
            <PopoverBody
              options={options}
              value={value}
              showFilter={showFilter}
              searchPlaceholder={searchPlaceholder}
              emptyLabel={emptyLabel}
              density="compact"
              onPicked={(next) => onChange(next as T)}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Overlay>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
