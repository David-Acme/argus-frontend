import { useRef, type RefObject } from 'react';
import type { TextInput } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Sheet } from '@/shared/ui/sheet';
import { CommandPanel } from './command-panel';
import type { CommandIntent, CommandProps } from './command-types';
import { useCommand } from './use-command';

type BodyProps = Omit<CommandProps, 'open'> & {
  inputRef: RefObject<TextInput | null>;
};

function Body({ onClose, source, onAsk, initialQuery, inputRef }: BodyProps) {
  const state = useCommand({ source, onAsk, onClose, initialQuery });
  return <CommandPanel state={state} inputRef={inputRef} />;
}

export function Command({ open, onClose, ...body }: CommandProps) {
  const { t } = useTranslation();
  const input = useRef<TextInput>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('common.overlay.command-label')}
      variant="list"
      long
      initialFocus={input}>
      {open ? <Body onClose={onClose} inputRef={input} {...body} /> : null}
    </Sheet>
  );
}

export function useCommandHotkey(onOpen: (intent: CommandIntent) => void): void {
  void onOpen;
}
