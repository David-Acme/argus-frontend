import type { ReactNode } from 'react';

type ListboxProps = { id: string; children: ReactNode };

export function optionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}

export function Listbox({ id, children }: ListboxProps) {
  return (
    <div role="listbox" id={id} className="p-palette-group">
      {children}
    </div>
  );
}
