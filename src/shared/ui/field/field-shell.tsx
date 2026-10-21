import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { inset } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';

export type FieldState = 'idle' | 'focus' | 'error';

export type FieldShellProps = {
  label?: string;
  hint?: string;
  error?: string;
  top?: 'field' | 'code';
  children: ReactNode;
};

type FieldNoteProps = Pick<FieldShellProps, 'hint' | 'error'>;

const FRAME_STATE: Record<FieldState, string> = {
  idle: 'bg-fill border-transparent',
  focus: 'bg-surface border-text',
  error: 'bg-surface border-alert',
};

export const FRAME_BORDER = { borderWidth: inset.field.border };

export function frameClass(state: FieldState): string {
  return clsx('rounded-well px-field-x gap-field-gap flex-row', FRAME_STATE[state]);
}

export function fieldState(focused: boolean, error: string | undefined): FieldState {
  if (error) return 'error';
  return focused ? 'focus' : 'idle';
}

function FieldNote({ hint, error }: FieldNoteProps) {
  if (error) {
    return (
      <View role="alert" className="mt-field-error-gap gap-field-error-gap flex-row items-start">
        <Icon name="alert" size="small" tone="alert" />
        <View className="min-w-0 flex-1">
          <Text variant="fieldError" tone="alert">
            {error}
          </Text>
        </View>
      </View>
    );
  }
  if (!hint) return null;
  return (
    <View className="mt-field-error-gap">
      <Text variant="meta">{hint}</Text>
    </View>
  );
}

export function FieldShell({ label, hint, error, top = 'field', children }: FieldShellProps) {
  return (
    <View className={top === 'code' ? 'mt-field-code-top' : 'mt-field-top'}>
      {label ? (
        <View className="mb-field-label-gap">
          <Text variant="control">{label}</Text>
        </View>
      ) : null}
      {children}
      <FieldNote hint={hint} error={error} />
    </View>
  );
}
