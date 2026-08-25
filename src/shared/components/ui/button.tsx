import { TextClassContext } from '@/shared/components/ui/text';
import { Icon } from '@/shared/components/ui/icon';
import { cn } from '@/shared/libs/utils';
import { getButtonState } from '@/shared/libs/button-state';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Shows request progress and prevents a duplicate press. */
    loading?: boolean;
  };

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none',
    Platform.select({
      web: "focus-visible:border-accent focus-visible:ring-accent/50 aria-invalid:ring-error/20 dark:aria-invalid:ring-error/40 aria-invalid:border-error whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-interactive active:bg-interactive-pressed shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-interactive-hover' })
        ),
        destructive: cn(
          'bg-error active:bg-error/90 shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-error/90 focus-visible:ring-error/20 dark:focus-visible:ring-error/40',
          })
        ),
        outline: cn(
          'border-border bg-background active:bg-surface-secondary dark:bg-surface-secondary dark:border-border dark:active:bg-border border shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-surface-secondary dark:hover:bg-border',
          })
        ),
        secondary: cn(
          'bg-surface-secondary active:bg-surface-secondary/80 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-surface-secondary/80' })
        ),
        ghost: cn(
          'active:bg-accent-soft dark:active:bg-accent-soft/60',
          Platform.select({ web: 'hover:bg-accent-soft dark:hover:bg-accent-soft/60' })
        ),
        link: '',
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-11 rounded-md px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-sm font-medium',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-foreground-on-interactive',
        destructive: 'text-destructive-foreground',
        outline: cn(
          'group-active:text-foreground',
          Platform.select({ web: 'group-hover:text-foreground' })
        ),
        secondary: 'text-foreground',
        ghost: 'group-active:text-foreground',
        link: cn(
          'text-accent group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function ButtonLoader() {
  const rotation = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 840, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  return (
    <Animated.View accessibilityElementsHidden style={style}>
      <Icon name="loader-circle" className="size-4" />
    </Animated.View>
  );
}

function Button({ className, variant, size, style, loading = false, disabled = false, children, ...props }: ButtonProps) {
  const buttonState = getButtonState({ disabled: Boolean(disabled), loading });

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        {...props}
        accessibilityState={{ ...props.accessibilityState, ...buttonState.accessibility }}
        className={cn(buttonState.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        disabled={buttonState.disabled}
        role="button"
        style={(state) => [
          typeof style === 'function' ? style(state) : style,
          state.pressed && !buttonState.disabled
            ? { transform: [{ scale: 0.97 }], opacity: 0.9 }
            : null,
        ]}>
        {(state) => (
          <>
            {loading ? <ButtonLoader /> : null}
            {loading && size === 'icon'
              ? null
              : typeof children === 'function'
                ? children(state)
                : children}
          </>
        )}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
