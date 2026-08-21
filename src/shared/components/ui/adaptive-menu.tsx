import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import type { MenuOption } from '@/core/types';
import { OptionRow } from '@/shared/components/ui/option-row';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/shared/components/ui/sheet';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type AdaptiveMenuProps<T extends string = string> = {
  options: readonly MenuOption<T>[];
  onSelect: (value: T) => void;
  trigger: ReactNode;
  /** Title of the sheet variant; a dropdown needs no header. */
  title: string;
  closeLabel: string;
  selected?: T;
  contentClassName?: string;
};

/** Beyond this the sheet scrolls instead of growing past the screen. */
const SHEET_MAX_HEIGHT = 420;

/**
 * Pick-one menu. A dropdown anchored to the trigger where there is a pointer,
 * a bottom sheet on phones — a dropdown on a phone means tiny targets against
 * the screen edge. Same options, same handler, one call site.
 */
export function AdaptiveMenu<T extends string = string>({
  options,
  onSelect,
  trigger,
  title,
  closeLabel,
  selected,
  contentClassName,
}: AdaptiveMenuProps<T>) {
  const { isCompact } = useWindowClass();
  const [open, setOpen] = useState(false);

  function chooseFromSheet(value: string) {
    setOpen(false);
    onSelect(value as T);
  }

  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className={contentClassName}>
          <SheetHeader title={title} closeLabel={closeLabel} />
          <ScrollView style={{ maxHeight: SHEET_MAX_HEIGHT }} showsVerticalScrollIndicator={false}>
            <View className="gap-0.5 pb-1">
              {options.map((option) => (
                <OptionRow
                  key={option.value}
                  option={option}
                  selected={option.value === selected}
                  onSelect={chooseFromSheet}
                />
              ))}
            </View>
          </ScrollView>
        </SheetContent>
      </Sheet>
    );
  }

  // The dropdown primitive owns its open state and closes on item press, so the
  // row must not handle the press itself (hence no onSelect below).
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Overlay
          className={cn('z-50', Platform.select({ web: 'fixed inset-0' }))}>
          <DropdownMenuPrimitive.Content
            insets={{ left: 12, right: 12 }}
            className={cn(
              'bg-card z-50 min-w-56 gap-0.5 rounded-[18px] p-1.5 shadow-lg shadow-black/15',
              Platform.select({ web: 'animate-in fade-in-0 zoom-in-95 origin-top' }),
              contentClassName
            )}>
            {options.map((option) => (
              <DropdownMenuPrimitive.Item
                key={option.value}
                asChild
                disabled={option.disabled}
                onPress={() => onSelect(option.value)}>
                <OptionRow
                  option={option}
                  selected={option.value === selected}
                  density="compact"
                />
              </DropdownMenuPrimitive.Item>
            ))}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Overlay>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
