import * as DialogPrimitive from '@rn-primitives/dialog';
import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { Platform, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import { Text } from '@/shared/components/ui/text';
import { IS_IOS, IS_NATIVE } from '@/shared/constants';
import { useKeyboardProgress } from '@/shared/hooks/use-keyboard-progress';
import { overlayIn, overlayOut, sheetIn, sheetOut } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';

type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, 'asChild'> & {
  children?: ReactNode;
  /** Hides the drag handle when the sheet is not dismissible by gesture. */
  showHandle?: boolean;
  /** Named portal host; defaults to the root one, like Dialog. */
  portalHost?: string;
};

type SheetHeaderProps = {
  title: string;
  description?: string;
  closeLabel: string;
};

/** Distance in points past which releasing the drag closes the sheet. */
const DISMISS_DISTANCE = 96;
/** Downward velocity that closes the sheet regardless of distance. */
const DISMISS_VELOCITY = 900;
/** Travel over which the dim fades out while dragging down. */
const DIM_TRAVEL = 260;
/** Resistance applied to an upward drag, the way a native sheet rubber-bands. */
const OVERDRAG_RESISTANCE = 0.25;
/**
 * Settle spring. Matched to Android's bottom-sheet feel: quick, barely any
 * overshoot, and velocity carried over so a flick continues rather than stops.
 */
const SETTLE_SPRING = { damping: 30, stiffness: 380, mass: 0.85 } as const;

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

const FullWindowOverlay = IS_IOS ? RNFullWindowOverlay : Fragment;

function SheetOverlay({
  className,
  children,
  onPress,
  dimStyle,
  ...props
}: Omit<ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
  children?: ReactNode;
  /** Ties the dim to the drag, so it lightens as the sheet is pulled down. */
  dimStyle?: AnimatedStyle<ViewStyle>;
}) {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    if (event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'bg-overlay absolute top-0 right-0 bottom-0 left-0 z-50 justify-end',
          Platform.select({ web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto' }),
          className
        )}
        {...props}
        onPress={Platform.select({ web: onOverlayPress, native: onPress })}
        asChild={IS_NATIVE}>
        <NativeOnlyAnimatedView
          entering={overlayIn}
          exiting={overlayOut}
          style={dimStyle}
          as="Pressable">
          <>{children}</>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

/**
 * Bottom sheet. On mobile it is the native-feeling stand-in for a dialog: it
 * slides from the bottom and follows the finger, so a drag down dismisses it.
 * Built on the dialog primitive to inherit the portal, the focus trap and the
 * escape handling instead of reimplementing them.
 */
function SheetContent({
  className,
  children,
  showHandle = true,
  portalHost,
  ...props
}: SheetContentProps) {
  const insets = useSafeAreaInsets();
  const { onOpenChange } = DialogPrimitive.useRootContext();
  const { offset: keyboardOffset } = useKeyboardProgress();
  const translateY = useSharedValue(0);

  const close = () => onOpenChange(false);

  const pan = Gesture.Pan()
    .enabled(IS_NATIVE && showHandle)
    .onChange((event) => {
      const next = translateY.value + event.changeY;
      // Upward travel is resisted instead of blocked, which is what makes a
      // native sheet feel attached to the finger rather than clamped.
      translateY.value = next < 0 ? next * OVERDRAG_RESISTANCE : next;
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        translateY.value = withSpring(
          720,
          { ...SETTLE_SPRING, velocity: event.velocityY, damping: 40 },
          () => runOnJS(close)()
        );
        return;
      }
      translateY.value = withSpring(0, { ...SETTLE_SPRING, velocity: event.velocityY });
    });

  // `keyboardOffset` is negative while the keyboard is up, so adding it lifts
  // the sheet in step with the real keyboard frame instead of guessing a height.
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + keyboardOffset.value }],
  }));

  // The dim tracks the drag, so letting go halfway reads as "still holding it".
  const dimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, DIM_TRAVEL], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <SheetPortal hostName={portalHost}>
      <SheetOverlay dimStyle={dimStyle}>
        <GestureDetector gesture={pan}>
          <NativeOnlyAnimatedView entering={sheetIn} exiting={sheetOut} className="w-full">
          <Animated.View style={sheetStyle} className="w-full">
            <DialogPrimitive.Content
              className={cn(
                'bg-card w-full gap-4 rounded-t-[28px] px-5 pt-3 shadow-2xl shadow-black/25',
                Platform.select({
                  web: 'animate-in slide-in-from-bottom-4 mx-auto max-w-lg rounded-b-[28px] sm:mb-4',
                }),
                className
              )}
              style={{ paddingBottom: insets.bottom + 20 }}
              {...props}>
              {showHandle ? (
                <View className="bg-border mx-auto h-1 w-10 rounded-full" accessible={false} />
              ) : null}
              {children}
            </DialogPrimitive.Content>
          </Animated.View>
          </NativeOnlyAnimatedView>
        </GestureDetector>
      </SheetOverlay>
    </SheetPortal>
  );
}

function SheetHeader({ title, description, closeLabel }: SheetHeaderProps) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 gap-1">
        <DialogPrimitive.Title asChild>
          <Text className="text-[17px] font-semibold">{title}</Text>
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description asChild>
            <Text className="text-muted-foreground text-[13px] leading-[18px]">{description}</Text>
          </DialogPrimitive.Description>
        ) : null}
      </View>
      <SheetClose
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        className="bg-surface-secondary size-8 items-center justify-center rounded-full active:opacity-70">
        <Icon name="x" className="text-foreground-secondary size-4" />
      </SheetClose>
    </View>
  );
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetOverlay, SheetPortal, SheetTrigger };
export type { SheetContentProps, SheetHeaderProps };
