import { ReminderDialog } from '@/features/agenda';
import type { AgendaActions } from '@/features/home/hooks/use-agenda-actions';

export type ReminderEditorProps = { actions: AgendaActions };

export function ReminderEditor({ actions }: ReminderEditorProps) {
  const { editing, closeEditing } = actions;
  if (!editing) return null;
  return (
    <ReminderDialog
      key={editing.id}
      open
      onOpenChange={(open) => {
        if (!open) closeEditing();
      }}
      reminder={editing}
    />
  );
}
