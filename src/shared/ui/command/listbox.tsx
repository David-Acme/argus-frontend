import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type ListboxProps = { id: string; fill?: boolean; children: ReactNode };

export function optionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}

export function Listbox({ id, fill, children }: ListboxProps) {
  return (
    <div
      role="listbox"
      id={id}
      className={clsx('p-palette-group flex flex-col', fill && 'min-h-0 flex-1 basis-0')}>
      {children}
    </div>
  );
}
