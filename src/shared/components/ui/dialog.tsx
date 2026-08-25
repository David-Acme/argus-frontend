import { Icon } from '@/shared/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import { IS_IOS, IS_NATIVE } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';
import { dialogIn, dialogOut, overlayIn, overlayOut } from '@/shared/libs/animations';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { Platform, Text, View, type GestureResponderEvent, type ViewProps } from 'react-native';
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

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    if (closeOnPress && event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'bg-overlay absolute top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center p-2',
          Platform.select({
            web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto',
          }),
          className
        )}
        {...props}
        closeOnPress={closeOnPress}
        onPress={Platform.select({ web: onOverlayPress, native: onPress })}
        asChild={IS_NATIVE}>
        <NativeOnlyAnimatedView entering={overlayIn} exiting={overlayOut} as="Pressable">
          {/* Full width, so the panel's own `w-full` resolves against the
              window and its max width can do the sizing. Without it the
              animation wrapper shrinks to the content and every dialog ends up
              as wide as its longest row. */}
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
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
  /** Disables the overlay press and the close button while they stay visible. */
  dismissible?: boolean;
}) {
  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay closeOnPress={dismissible}>
        <DialogPrimitive.Content
          className={cn(
            'bg-background border-border z-50 mx-auto flex max-h-[94%] w-full flex-col gap-4 rounded-lg border p-6 shadow-lg shadow-black/5 sm:max-w-lg',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 duration-200 web:max-w-[calc(100%-2rem)]',
            }),
            className
          )}
          {...props}>
          <>{children}</>
          <DialogPrimitive.Close
            disabled={!dismissible}
            className={cn(
              'absolute right-4 top-4 rounded',
              dismissible ? 'opacity-70 active:opacity-100' : 'opacity-40',
              Platform.select({
                web: 'ring-offset-background focus:ring-ring data-[state=open]:bg-accent transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none',
              })
            )}
            hitSlop={12}>
            <Icon
              name="x"
              className={cn('text-accent-foreground web:pointer-events-none size-4 shrink-0')}
            />
            <Text className="sr-only">Close</Text>
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
