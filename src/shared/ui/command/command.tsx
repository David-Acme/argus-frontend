import * as DialogPrimitive from '@rn-primitives/dialog';
import { useEffect, useEffectEvent } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { CommandPalette } from './command-palette';
import { CommandPanel } from './command-panel';
import type { CommandProps } from './command-types';
import { useCommand } from './use-command';

type BodyProps = Pick<CommandProps, 'onClose' | 'source' | 'onAsk' | 'askMark'>;

function Body({ onClose, source, onAsk, askMark }: BodyProps) {
  const state = useCommand({ source, onAsk, onClose });
  return (
    <CommandPalette>
      <CommandPanel state={state} askMark={askMark} hints />
    </CommandPalette>
  );
}

export function Command({ open, onClose, source, onAsk, askMark }: CommandProps) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-scrim-soft pt-palette-top px-palette-group fixed inset-0 items-center">
          <DialogPrimitive.Content className="max-w-full">
            <DialogPrimitive.Title className="sr-only">
              {t('common.overlay.command-label')}
            </DialogPrimitive.Title>
            <Body onClose={onClose} source={source} onAsk={onAsk} askMark={askMark} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function useCommandHotkey(onOpen: () => void): void {
  const fire = useEffectEvent(onOpen);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      fire();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, []);
}
