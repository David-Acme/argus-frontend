import * as AlertPrimitive from '@rn-primitives/alert-dialog';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { layout } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ConfirmBox } from './confirm-box';
import { useConfirmLatch } from './use-confirm-latch';
import type { ConfirmProps } from './confirm-types';

type FrameProps = { children: ReactNode };

const CONTENT = { maxWidth: layout.dialog };

function Heading({ children }: FrameProps) {
  return (
    <AlertPrimitive.Title asChild>
      <View>{children}</View>
    </AlertPrimitive.Title>
  );
}

function Description({ children }: FrameProps) {
  return (
    <AlertPrimitive.Description asChild>
      <View>{children}</View>
    </AlertPrimitive.Description>
  );
}

function useBackCancels(open: boolean, onCancel: () => void): void {
  const cancel = useEffectEvent(onCancel);
  useEffect(() => {
    if (!open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => subscription.remove();
  }, [open]);
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const { t } = useTranslation();
  const destructive = variant === 'destructive';
  const latch = useConfirmLatch(open);
  const cancel = latch.once(onCancel);
  useBackCancels(open, cancel);
  return (
    <AlertPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="bg-scrim web:backdrop-blur-scrim web:fixed px-dialog-edge absolute inset-0 items-center justify-center">
          <Pressable
            focusable={false}
            disabled={destructive}
            onPress={cancel}
            className="absolute inset-0"
          />
          <AlertPrimitive.Content style={CONTENT} className="w-full">
            <ConfirmBox
              title={title}
              body={body}
              confirmLabel={confirmLabel}
              cancelLabel={t('common.cancel')}
              destructive={destructive}
              busy={latch.busy}
              onConfirm={latch.once(onConfirm)}
              onCancel={cancel}
              Heading={Heading}
              Description={Description}
            />
          </AlertPrimitive.Content>
        </AlertPrimitive.Overlay>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
