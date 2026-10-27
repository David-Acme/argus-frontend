import * as AlertPrimitive from '@rn-primitives/alert-dialog';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { layout, overlayMotion, overlayWebIn } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ConfirmBox } from './confirm-box';
import { useConfirmLatch } from './use-confirm-latch';
import type { ConfirmProps } from './confirm-types';

type FrameProps = { children: ReactNode };

const CONTENT = { maxWidth: layout.dialog };

const Scrim = Animated.createAnimatedComponent(Pressable);

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
        <AlertPrimitive.Overlay className="web:fixed px-dialog-edge absolute inset-0 items-center justify-center">
          <Scrim
            entering={overlayMotion.scrimIn}
            exiting={overlayMotion.scrimOut}
            focusable={false}
            disabled={destructive}
            onPress={cancel}
            className={`bg-scrim web:backdrop-blur-scrim absolute inset-0 ${overlayWebIn.scrim}`}
          />
          <AlertPrimitive.Content style={CONTENT} className="w-full">
            <Animated.View
              entering={overlayMotion.dialogIn}
              exiting={overlayMotion.dialogOut}
              className={`w-full items-center ${overlayWebIn.panel}`}>
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
            </Animated.View>
          </AlertPrimitive.Content>
        </AlertPrimitive.Overlay>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
