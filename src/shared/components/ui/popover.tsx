import * as PopoverPrimitive from '@rn-primitives/popover';
import { type ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { IS_NATIVE } from '@/shared/constants';
import { menuIn, menuOut } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';
import { NativeOnlyAnimatedView } from './native-only-animated-view';
import { TextClassContext } from './text';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

/**
 * Anchored floating panel. The primitive measures the trigger and positions the
 * content against it, which is the whole point of using it instead of an
 * absolutely placed view: a hand-picked `top`/`right` is only ever correct for
 * one screen size and one scroll offset.
 */
function PopoverContent({
  className,
  overlayClassName,
  portalHost,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content> & {
  overlayClassName?: string;
  portalHost?: string;
}) {
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <PopoverPrimitive.Overlay
        // On native the overlay is the outside-press target, so it has to cover
        // the window; on web the portal is already document-level.
        style={IS_NATIVE ? StyleSheet.absoluteFill : undefined}
        className={cn(Platform.select({ web: 'fixed inset-0 z-50' }), overlayClassName)}>
        <TextClassContext.Provider value="text-foreground">
          <PopoverPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            // Keeps the panel off the screen edges when the trigger sits in a
            // corner, instead of letting it hang half outside.
            insets={{ left: 12, right: 12, top: 12, bottom: 12 }}
            className={cn('z-50', className)}
            {...props}>
            <NativeOnlyAnimatedView entering={menuIn} exiting={menuOut}>
              <View
                className={cn(
                  'bg-card border-border-subtle w-72 rounded-[22px] border p-4 shadow-xl shadow-black/15',
                  Platform.select({ web: 'animate-in fade-in-0 zoom-in-95 origin-top' })
                )}>
                {children}
              </View>
            </NativeOnlyAnimatedView>
          </PopoverPrimitive.Content>
        </TextClassContext.Provider>
      </PopoverPrimitive.Overlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger };
