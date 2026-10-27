import { useState, type ReactNode } from 'react';
import { Confirm } from '@/shared/ui/confirm';
import type { MenuConfirm, MenuDanger, MenuRun } from './menu-types';

type Asking = { item: MenuDanger; words: MenuConfirm };

export type MenuRunner = { run: MenuRun; confirm: ReactNode };

export function useMenuRun(): MenuRunner {
  const [asking, setAsking] = useState<Asking | null>(null);
  const run: MenuRun = (item) => {
    if (item.destructive && item.confirm !== 'by-action') setAsking({ item, words: item.confirm });
    else void item.onPress();
  };
  const confirm = asking ? (
    <Confirm
      open
      title={asking.words.title}
      body={asking.words.body}
      confirmLabel={asking.words.confirmLabel}
      variant="destructive"
      onConfirm={() => {
        setAsking(null);
        void asking.item.onPress();
      }}
      onCancel={() => setAsking(null)}
    />
  ) : null;
  return { run, confirm };
}
