import { Icon } from '@/shared/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import { IS_IOS, IS_NATIVE, IS_WEB } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';
import { dialogIn, dialogOut, overlayIn, overlayOut } from '@/shared/libs/animations';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { Fragment, useRef, type ComponentProps, type ReactNode } from 'react';
import { Platform, View, type GestureResponderEvent, type PointerEvent, type ViewProps } from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const FullWindowOverlay = IS_IOS ? RNFullWindowOverlay : Fragment;

function DialogOverlay({
  className,
  children,
  onPress,
  closeOnPress = true,
  ...props
}: Omit<ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
  children?: ReactNode;
}) {
  const { onOpenChange } = DialogPrimitive.useRootContext();
  const pressedOnBackdrop = useRef(false);

  function onOverlayPointerDown(event: PointerEvent) {
    pressedOnBackdrop.current = event.target === event.currentTarget;
  }

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    const fromBackdrop = pressedOnBackdrop.current;
    pressedOnBackdrop.current = false;
    if (closeOnPress && fromBackdrop && event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'bg-overlay absolute top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center p-3 sm:p-6',
          Platform.select({
            web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto [&>[role=dialog]]:flex [&>[role=dialog]]:max-h-full [&>[role=dialog]]:w-full [&>[role=dialog]]:flex-col [&>[role=dialog]]:items-center',
          }),
          className
        )}
        {...props}
        {...(IS_WEB ? { onPointerDown: onOverlayPointerDown } : null)}
        closeOnPress={closeOnPress}
        onPress={IS_WEB ? onOverlayPress : onPress}
        asChild={IS_NATIVE}>
        <NativeOnlyAnimatedView entering={overlayIn} exiting={overlayOut} as="Pressable">
          <NativeOnlyAnimatedView
            entering={dialogIn}
            exiting={dialogOut}
            className="w-full items-center">
            <>{children}</>
          </NativeOnlyAnimatedView>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

function DialogContent({
  className,
  portalHost,
  children,
  dismissible = true,
  closeLabel = 'Close',
  onEscapeKeyDown,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
  dismissible?: boolean;
  closeLabel?: string;
}) {
  const escape: typeof onEscapeKeyDown = (event) => {
    onEscapeKeyDown?.(event);
    if (!dismissible) event.preventDefault();
  };
  const outside: ComponentProps<typeof DialogPrimitive.Content>['onInteractOutside'] = (event) => {
    if (!dismissible) event.preventDefault();
  };

  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay closeOnPress={dismissible}>
        <DialogPrimitive.Content
          onInteractOutside={outside}
          className={cn(
            'bg-background border-border z-50 mx-auto flex w-full flex-col gap-4 rounded-3xl border p-6 shadow-lg shadow-black/5 sm:max-w-lg',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 max-h-full min-h-0 shrink duration-200',
              native: 'max-h-[94%]',
            }),
            className
          )}
          onEscapeKeyDown={escape}
          {...props}>
          <>{children}</>
          <DialogPrimitive.Close
            disabled={!dismissible}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            className={cn(
              'bg-surface-secondary absolute top-5 right-5 size-8 items-center justify-center rounded-full',
              dismissible ? 'active:opacity-70' : 'opacity-40',
              Platform.select({ web: 'hover:bg-border transition-colors' })
            )}
            hitSlop={8}>
            <Icon name="x" className="text-foreground-secondary web:pointer-events-none size-4 shrink-0" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ViewProps) {
  return (
    <View className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-foreground text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
