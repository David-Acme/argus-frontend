import { useRef } from 'react';
import { Sheet, useOpenedOnce } from '@/shared/ui/sheet';
import { MenuList } from './menu-list';
import type { MenuItem, MenuRun } from './menu-types';

export type MenuSheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  items: readonly MenuItem[];
  onRun: MenuRun;
};

export function MenuSheet({ open, onClose, label, items, onRun }: MenuSheetProps) {
  const mounted = useOpenedOnce(open);
  const chosen = useRef<MenuItem | null>(null);
  const settle = () => {
    const item = chosen.current;
    chosen.current = null;
    onClose();
    if (item) onRun(item);
  };
  const pick = (item: MenuItem) => {
    chosen.current = item;
    onClose();
  };
  if (!mounted) return null;
  return (
    <Sheet open={open} onClose={settle} title={label} variant="list">
      <MenuList label={label} items={items} onPick={pick} />
    </Sheet>
  );
}
