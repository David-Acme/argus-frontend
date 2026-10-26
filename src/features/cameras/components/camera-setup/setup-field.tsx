import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { TextContent } from '@/shared/ui/field';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Field } from '@/shared/ui/field';
import type { CameraFormValues } from '@/features/cameras/components/camera-form-schema';

export type SetupFieldName =
  | 'name'
  | 'ip'
  | 'port'
  | 'username'
  | 'password'
  | 'cloudUsername'
  | 'cloudPassword'
  | 'streamPath'
  | 'subStreamPath'
  | 'retentionDays';

export type SetupFieldProps = {
  control: Control<CameraFormValues>;
  name: SetupFieldName;
  label: string;
  placeholder?: string;
  hint?: string;
  content?: TextContent;
  secret?: boolean;
};

export function SetupField({
  control,
  name,
  label,
  placeholder,
  hint,
  content,
  secret,
}: SetupFieldProps) {
  const { tk } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message ? tk(fieldState.error.message) : undefined;
        return secret ? (
          <Field
            kind="secret"
            label={label}
            placeholder={placeholder}
            hint={hint}
            value={field.value}
            error={error}
            onChangeText={field.onChange}
          />
        ) : (
          <Field
            label={label}
            placeholder={placeholder}
            hint={hint}
            content={content}
            value={field.value}
            error={error}
            onChangeText={field.onChange}
          />
        );
      }}
    />
  );
}
