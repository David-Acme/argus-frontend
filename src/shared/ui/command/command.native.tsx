import { useTranslation } from '@/shared/hooks/use-translation';
import { CommandPanel } from './command-panel';
import type { CommandProps } from './command-types';
import { useCommand } from './use-command';

type BodyProps = Pick<CommandProps, 'onClose' | 'source' | 'onAsk' | 'askMark'>;

function Body({ onClose, source, onAsk, askMark }: BodyProps) {
  const state = useCommand({ source, onAsk, onClose });
  return <CommandPanel state={state} askMark={askMark} />;
}

export function Command({ open, onClose, source, onAsk, askMark, sheet: Sheet }: CommandProps) {
  const { t } = useTranslation();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('common.overlay.command-label')}
      variant="list"
      long>
      {open ? <Body onClose={onClose} source={source} onAsk={onAsk} askMark={askMark} /> : null}
    </Sheet>
  );
}

export function useCommandHotkey(onOpen: () => void): void {
  void onOpen;
}
