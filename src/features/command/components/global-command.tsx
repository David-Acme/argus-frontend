import { Command, useCommandHotkey, type CommandIntent } from '@/shared/ui/command';
import { useOpenedOnce } from '@/shared/ui/sheet';
import { useCommandSource } from '@/features/command/hooks/use-command-source';
import { useCommandStore } from '@/features/command/stores/command.store';

type CommandHostProps = {
  open: boolean;
  intent: CommandIntent;
  query: string;
  openedAt: number;
  onClose: () => void;
};

function CommandHost({ open, intent, query, openedAt, onClose }: CommandHostProps) {
  const { source, onAsk } = useCommandSource({ intent, openedAt });
  return (
    <Command open={open} onClose={onClose} source={source} onAsk={onAsk} initialQuery={query} />
  );
}

export function GlobalCommand() {
  const open = useCommandStore((state) => state.open);
  const intent = useCommandStore((state) => state.intent);
  const query = useCommandStore((state) => state.query);
  const openedAt = useCommandStore((state) => state.openedAt);
  const launch = useCommandStore((state) => state.launch);
  const close = useCommandStore((state) => state.close);
  const mounted = useOpenedOnce(open);

  useCommandHotkey((next) => {
    if (!open) launch(next);
  });

  if (!mounted) return null;
  return (
    <CommandHost open={open} intent={intent} query={query} openedAt={openedAt} onClose={close} />
  );
}
