import { cn } from '@/shared/libs/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { createContext, useContext } from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

type TextProps = React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  };

const textVariants = cva(
  cn(
    'text-foreground text-base',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        display: 'text-display font-bold tracking-tight',
        title: 'text-2xl font-semibold leading-[30px] tracking-tight',
        headline: 'text-xl font-semibold leading-[26px]',
        subhead: 'text-subhead font-semibold',
        body: 'text-body',
        label: 'text-sm font-medium leading-5',
        caption: 'text-muted-foreground text-caption',
        micro: 'text-muted-foreground text-micro font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const ROLE: Partial<Record<TextVariant, Role>> = {
  display: 'heading',
  title: 'heading',
  headline: 'heading',
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  display: '1',
  title: '2',
  headline: '3',
};

const MAX_FONT_SCALE = 1.6;

const TextClassContext = createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: TextProps) {
  const textClass = useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...props}
    />
  );
}

export { Text, TextClassContext };
