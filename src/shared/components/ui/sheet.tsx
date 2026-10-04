import * as DialogPrimitive from '@rn-primitives/dialog';
import { Fragment, useEffect, type ComponentProps, type ReactNode } from 'react';
import { Platform, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import { Text } from '@/shared/components/ui/text';
import {
  IS_IOS,
  IS_NATIVE,
  SHEET_DISMISS_DISTANCE,
  SHEET_DISMISS_VELOCITY,
  SHEET_DIM_TRAVEL,
  SHEET_OVERDRAG_RESISTANCE,
  SHEET_SETTLE_SPRING,
} from '@/shared/constants';
import { useKeyboardProgress } from '@/shared/hooks/use-keyboard-progress';
import { overlayIn, overlayOut, sheetIn, sheetOut } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';

type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, 'asChild'> & {
  children?: ReactNode;
  showHandle?: boolean;
  dismissible?: boolean;
  portalHost?: string;
};

type SheetHeaderProps = {
  title: string;
  description?: string;
  closeLabel: string;
  dismissible?: boolean;
};

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
  dismissible = true,
  ...props
}: Omit<ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
  children?: ReactNode;
  dimStyle?: AnimatedStyle<ViewStyle>;
  dismissible?: boolean;
}) {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    if (dismissible && event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'absolute top-0 right-0 bottom-0 left-0 z-50',
          Platform.select({ web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto' }),
          className
        )}
        {...props}
        closeOnPress={dismissible}
        onPress={Platform.select({ web: onOverlayPress, native: onPress })}
        asChild={IS_NATIVE}>
        <NativeOnlyAnimatedView
          entering={overlayIn}
          exiting={overlayOut}
          as="Pressable">
          <Animated.View style={dimStyle} className="bg-overlay h-full w-full justify-end">
            <>{children}</>
          </Animated.View>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

function SheetContent({
  className,
  children,
  showHandle = true,
  portalHost,
  dismissible = true,
  ...props
}: SheetContentProps) {
  const insets = useSafeAreaInsets();
  const { open, onOpenChange } = DialogPrimitive.useRootContext();
  const { offset: keyboardOffset } = useKeyboardProgress();
  const translateY = useSharedValue(0);
  const closing = useSharedValue(false);
  const sheetHeight = useSharedValue(0);
  const bottomInset = useSharedValue(insets.bottom);

  useEffect(() => {
    bottomInset.value = insets.bottom;
  }, [bottomInset, insets.bottom]);

  useEffect(() => {
    if (!open) return;
    translateY.value = 0;
    closing.value = false;
  }, [open, closing, translateY]);

  const close = () => {
    onOpenChange(false);
  };

  const endDrag = (velocityY: number) => {
    'worklet';
    if (
      dismissible &&
      (translateY.value > SHEET_DISMISS_DISTANCE || velocityY > SHEET_DISMISS_VELOCITY)
    ) {
      closing.value = true;
      scheduleOnRN(close);
      return;
    }
    translateY.value = withSpring(0, { ...SHEET_SETTLE_SPRING, velocity: velocityY });
  };

  const pan = Gesture.Pan()
    .enabled(IS_NATIVE && showHandle)
    .onChange((event) => {
      if (closing.value) return;
      const next = translateY.value + event.changeY;
      translateY.value = next < 0 ? next * SHEET_OVERDRAG_RESISTANCE : next;
    })
    .onEnd((event) => {
      if (closing.value) return;
      endDrag(event.velocityY);
    })
    .onFinalize((event, success) => {
      if (success || closing.value) return;
      endDrag(event.velocityY);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + keyboardOffset.value }],
  }));

  const dimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SHEET_DIM_TRAVEL], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <SheetPortal hostName={portalHost}>
      <SheetOverlay dimStyle={dimStyle} dismissible={dismissible}>
        <GestureDetector gesture={pan}>
          <NativeOnlyAnimatedView entering={sheetIn} exiting={sheetOut} className="w-full">
          <Animated.View
            style={sheetStyle}
            className="w-full"
            onLayout={(event) => {
              sheetHeight.value = event.nativeEvent.layout.height;
            }}>
            <DialogPrimitive.Content
              className={cn(
                'bg-card w-full gap-4 rounded-t-4xl px-5 pt-3 shadow-2xl shadow-black/25',
                Platform.select({
                  web: 'animate-in slide-in-from-bottom-4 mx-auto max-w-lg rounded-b-4xl sm:mb-4',
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

function SheetHeader({
  title,
  description,
  closeLabel,
  dismissible = true,
}: SheetHeaderProps) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 gap-1">
        <DialogPrimitive.Title asChild>
          <Text className="text-subhead font-semibold">{title}</Text>
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description asChild>
            <Text className="text-muted-foreground text-caption leading-[18px]">{description}</Text>
          </DialogPrimitive.Description>
        ) : null}
      </View>
      <SheetClose
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        disabled={!dismissible}
        className={cn(
          'bg-surface-secondary size-8 items-center justify-center rounded-full',
          dismissible ? 'active:opacity-70' : 'opacity-40'
        )}>
        <Icon name="x" className="text-foreground-secondary size-4" />
      </SheetClose>
    </View>
  );
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetOverlay, SheetPortal, SheetTrigger };
export type { SheetContentProps, SheetHeaderProps };
