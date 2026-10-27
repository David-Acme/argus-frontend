import * as DialogPrimitive from '@rn-primitives/dialog';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { space, useThemeTokens } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { MenuList } from './menu-list';
import { stepFocus } from './menu-model';
import type { MenuItem, MenuRun } from './menu-types';

export type MenuSheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  items: readonly MenuItem[];
  onRun: MenuRun;
};

type ListKeyEvent = { key: string; currentTarget: HTMLElement; preventDefault: () => void };

const ITEM = '[role="menuitem"]';

function moveFocus(event: ListKeyEvent): void {
  const rows = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEM)];
  const current = rows.findIndex((row) => row === globalThis.document.activeElement);
  const next = stepFocus(current, event.key, rows.length);
  if (next === null) return;
  event.preventDefault();
  rows[next]?.focus();
}

function focusFirst(event: Event): void {
  const first =
    event.target instanceof HTMLElement ? event.target.querySelector<HTMLElement>(ITEM) : null;
  if (!first) return;
  event.preventDefault();
  first.focus();
}

const KEYS = { onKeyDown: moveFocus };

export function MenuSheet({ open, onClose, label, items, onRun }: MenuSheetProps) {
  const { t } = useTranslation();
  const { elevation } = useThemeTokens();
  const { height } = useWindowDimensions();
  const panel = { maxHeight: height - space[12], boxShadow: elevation.float };
  const pick = (item: MenuItem) => {
    onClose();
    onRun(item);
  };
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          closeOnPress={false}
          className="bg-scrim web:fixed absolute inset-0 justify-end">
          <DialogPrimitive.Content
            onOpenAutoFocus={focusFirst}
            style={panel}
            className="rounded-t-sheet bg-surface pb-section-top w-full">
            <View className="px-row-x pt-palette-group gap-row-gap min-h-row flex-row items-center">
              <View className="min-w-0 flex-1">
                <DialogPrimitive.Title asChild>
                  <Text variant="headline" numberOfLines={1}>
                    {label}
                  </Text>
                </DialogPrimitive.Title>
              </View>
              <Button
                iconOnly
                compact
                filled
                icon="x"
                label={t('common.close')}
                onPress={onClose}
              />
            </View>
            <ScrollView>
              <View {...KEYS}>
                <MenuList label={label} items={items} onPick={pick} />
              </View>
            </ScrollView>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
