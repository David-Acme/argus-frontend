import { cn } from '@/shared/libs/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, TextInput } from 'react-native';

type InputProps = React.ComponentPropsWithoutRef<typeof TextInput> &
  VariantProps<typeof inputVariants>;

const inputVariants = cva(
  cn(
    'border-border bg-card text-foreground placeholder:text-muted-foreground h-11 w-full min-w-0 flex-row items-center rounded-md border px-3 py-2 text-base leading-5 shadow-sm shadow-black/5',
    Platform.select({
      web: cn(
        'selection:bg-primary selection:text-primary-foreground transition-[color,box-shadow] outline-none md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
      ),
      native: 'placeholder:text-muted-foreground/50',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        error: 'border-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Input({ className, variant, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        inputVariants({ variant }),
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({
              web: 'disabled:pointer-events-none disabled:cursor-not-allowed',
            })
          ),
        className
      )}
      {...props}
    />
  );
}

export { Input, inputVariants, type InputProps };
