import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import type { MenuOption } from '@/core/types';
import { OptionRow } from '@/shared/components/ui/option-row';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/shared/components/ui/sheet';
import { IS_NATIVE } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { shouldUseAdaptiveMenuSheet } from '@/shared/libs/adaptive-menu-layout';
import { cn } from '@/shared/libs/utils';

type AdaptiveMenuProps<T extends string = string> = {
  options: readonly MenuOption<T>[];
  onSelect: (value: T) => void;
  trigger: ReactNode;
  title: string;
  closeLabel: string;
  selected?: T;
  contentClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SHEET_MAX_HEIGHT = 420;

export function AdaptiveMenu<T extends string = string>({
  options,
  onSelect,
  trigger,
  title,
  closeLabel,
  selected,
  contentClassName,
  open: controlledOpen,
  onOpenChange,
}: AdaptiveMenuProps<T>) {
  const { isCompact, isExpanded, isShort } = useWindowClass();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const chosen = useRef<{ value: T } | null>(null);

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function chooseFromSheet(value: string) {
    setOpen(false);
    onSelect(value as T);
  }

  if (shouldUseAdaptiveMenuSheet({ isCompact, isExpanded, isNative: IS_NATIVE, isShort })) {
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

  function settleDropdown(next: boolean) {
    const selection = chosen.current;
    if (next || !selection) return;
    chosen.current = null;
    requestAnimationFrame(() => onSelect(selection.value));
  }

  return (
    <DropdownMenuPrimitive.Root onOpenChange={settleDropdown}>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Overlay
          className={cn('z-50', Platform.select({ web: 'fixed inset-0' }))}>
          <DropdownMenuPrimitive.Content
            insets={{ left: 12, right: 12 }}
            className={cn(
              'bg-card z-50 min-w-56 gap-0.5 rounded-2xl p-1.5 shadow-lg shadow-black/15',
              Platform.select({ web: 'animate-in fade-in-0 zoom-in-95 origin-top' }),
              contentClassName
            )}>
            {options.map((option) => (
              <DropdownMenuPrimitive.Item
                key={option.value}
                asChild
                disabled={option.disabled}
                onPress={() => {
                  chosen.current = { value: option.value };
                }}>
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
