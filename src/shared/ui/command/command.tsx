import * as DialogPrimitive from '@rn-primitives/dialog';
import { useEffect, useEffectEvent } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { paletteTopOf, useHeightLayout } from '@/shared/theme';
import { CommandPalette } from './command-palette';
import { CommandPanel } from './command-panel';
import type { CommandIntent, CommandProps } from './command-types';
import { useCommand } from './use-command';

type BodyProps = Omit<CommandProps, 'open'>;

function Body({ onClose, source, onAsk, initialQuery }: BodyProps) {
  const state = useCommand({ source, onAsk, onClose, initialQuery });
  return (
    <CommandPalette>
      <CommandPanel state={state} hints />
    </CommandPalette>
  );
}

export function Command({ open, onClose, ...body }: CommandProps) {
  const { t } = useTranslation();
  const top = { paddingTop: paletteTopOf(useHeightLayout()) };
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={top}
          className="bg-scrim-soft px-palette-group fixed inset-0 items-center">
          <Pressable focusable={false} onPress={onClose} className="absolute inset-0" />
          <DialogPrimitive.Content className="max-w-full">
            <DialogPrimitive.Title className="sr-only">
              {t('common.overlay.command-label')}
            </DialogPrimitive.Title>
            <Body onClose={onClose} {...body} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const PLAIN_KEYS: Readonly<Record<string, CommandIntent>> = { '/': 'search', n: 'create' };

function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function intentOf(event: KeyboardEvent): CommandIntent | null {
  if (event.isComposing) return null;
  if (event.metaKey || event.ctrlKey) {
    return event.key.toLowerCase() === 'k' && !event.altKey ? 'search' : null;
  }
  if (event.altKey || event.repeat || typingIn(event.target)) return null;
  return PLAIN_KEYS[event.key] ?? null;
}

export function useCommandHotkey(onOpen: (intent: CommandIntent) => void): void {
  const fire = useEffectEvent(onOpen);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const intent = intentOf(event);
      if (intent === null) return;
      event.preventDefault();
      fire(intent);
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, []);
}
