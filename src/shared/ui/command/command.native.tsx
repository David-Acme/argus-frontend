import { useRef, type RefObject } from 'react';
import type { TextInput } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Sheet } from '@/shared/ui/sheet';
import { CommandPanel } from './command-panel';
import type { CommandProps } from './command-types';
import { useCommand } from './use-command';

type BodyProps = Pick<CommandProps, 'onClose' | 'source' | 'onAsk' | 'askMark'> & {
  inputRef: RefObject<TextInput | null>;
};

function Body({ onClose, source, onAsk, askMark, inputRef }: BodyProps) {
  const state = useCommand({ source, onAsk, onClose });
  return <CommandPanel state={state} askMark={askMark} inputRef={inputRef} />;
}

export function Command({ open, onClose, source, onAsk, askMark }: CommandProps) {
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
      {open ? (
        <Body onClose={onClose} source={source} onAsk={onAsk} askMark={askMark} inputRef={input} />
      ) : null}
    </Sheet>
  );
}

export function useCommandHotkey(onOpen: () => void): void {
  void onOpen;
}
