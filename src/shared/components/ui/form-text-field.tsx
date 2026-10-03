import type { ComponentProps } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

type FormTextFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'onBlur'
> & {
  control: Control<TValues>;
  name: TName;
  label: string;
  className?: string;
};

export function FormTextField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  className,
  ...input
}: FormTextFieldProps<TValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...input} {...field} onChangeText={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
