import { Icon } from '@/shared/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import { TextClassContext } from '@/shared/components/ui/text';
import { IS_IOS, IS_NATIVE, IS_WEB } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';
import {
  contextMenuIn,
  contextMenuOut,
  menuIn,
  menuOut,
  overlayIn,
  overlayOut,
} from '@/shared/libs/animations';
import * as ContextMenuPrimitive from '@rn-primitives/context-menu';
import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { Platform, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  children?: ReactNode;
  iconClassName?: string;
  inset?: boolean;
}) {
  const { open } = ContextMenuPrimitive.useSubContext();
  const icon = IS_WEB ? 'chevron-right' : open ? 'chevron-up' : 'chevron-down';
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground'
      )}>
      <ContextMenuPrimitive.SubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center justify-between rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
          }),
          className,
          open && cn('bg-accent', Platform.select({ native: 'mb-1' })),
          inset && 'pl-8'
        )}
        {...props}>
        <>{children}</>
        <Icon name={icon} className={cn('text-foreground size-4 shrink-0', iconClassName)} />
      </ContextMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function ContextMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={menuIn} exiting={menuOut}>
      <ContextMenuPrimitive.SubContent
        className={cn(
          'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 origin-(--radix-context-menu-content-transform-origin)',
          }),
          className
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

const FullWindowOverlay = IS_IOS ? RNFullWindowOverlay : Fragment;

function ContextMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayClassName?: string;
  portalHost?: string;
}) {
  return (
    <ContextMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <ContextMenuPrimitive.Overlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  overlayStyle as typeof StyleSheet.absoluteFill,
                ])
              : StyleSheet.absoluteFill,
          })}
          className={overlayClassName}
          asChild={IS_NATIVE}>
          <NativeOnlyAnimatedView entering={overlayIn} exiting={overlayOut} as="Pressable">
            <TextClassContext.Provider value="text-popover-foreground">
              <NativeOnlyAnimatedView entering={contextMenuIn} exiting={contextMenuOut}>
                <ContextMenuPrimitive.Content
                  className={cn(
                    'bg-popover border-border min-w-32 overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                    Platform.select({
                      web: cn(
                        'animate-in fade-in-0 zoom-in-95 z-50 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) cursor-default',
                        props.side === 'bottom' && 'slide-in-from-top-2',
                        props.side === 'top' && 'slide-in-from-bottom-2'
                      ),
                    }),
                    className
                  )}
                  {...props}
                />
              </NativeOnlyAnimatedView>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </ContextMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  variant,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' && 'text-destructive group-active:text-destructive'
      )}>
      <ContextMenuPrimitive.Item
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: cn(
              'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none',
              variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20'
            ),
          }),
          variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem> & {
  children?: ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <ContextMenuPrimitive.CheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <ContextMenuPrimitive.ItemIndicator>
            <Icon
              name={'check'}
              className={cn(
                'text-foreground size-4',
                Platform.select({ web: 'pointer-events-none' })
              )}
            />
          </ContextMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </ContextMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.RadioItem> & {
  children?: ReactNode;
}) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <ContextMenuPrimitive.RadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <ContextMenuPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </ContextMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </ContextMenuPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Label> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      className={cn(
        'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({ className, ...props }: ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
