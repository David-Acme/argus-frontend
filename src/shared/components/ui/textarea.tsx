import { Platform, TextInput } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/libs/utils';

type TextareaProps = React.ComponentPropsWithoutRef<typeof TextInput> &
  VariantProps<typeof textareaVariants>;

const textareaVariants = cva(
  cn(
    'border-border bg-card text-foreground placeholder:text-muted-foreground min-h-[88px] w-full rounded-md border px-3 py-2.5 text-base leading-5 shadow-sm shadow-black/5',
    Platform.select({
      web: cn(
        'field-sizing-content transition-[color,box-shadow] outline-none md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
      ),
      native: 'placeholder:text-muted-foreground/50',
    })
  ),
  {
    variants: {
      variant: { default: '', error: 'border-error' },
    },
    defaultVariants: { variant: 'default' },
  }
);

/** Multiline input. `textAlignVertical` keeps Android from centring the first line. */
function Textarea({ className, variant, ...props }: TextareaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      className={cn(textareaVariants({ variant }), props.editable === false && 'opacity-50', className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
