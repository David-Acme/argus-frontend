import type { ComponentType, ReactNode } from 'react';
import { View } from 'react-native';
import { layout, useThemeTokens } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

type FrameProps = { children: ReactNode };

export type ConfirmBoxProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  Heading?: ComponentType<FrameProps>;
  Description?: ComponentType<FrameProps>;
};

type ActProps = { label: string; alert?: boolean; onPress: () => void };

function Plain({ children }: FrameProps) {
  return <View>{children}</View>;
}

function Act({ label, alert, onPress }: ActProps) {
  return (
    <PressableSurface
      a11y={{ label, role: 'button' }}
      onPress={onPress}
      pressed={{ scale: 'surface', fill: true }}
      className="min-h-target-min px-dialog-actions-x justify-center rounded-full">
      <Text variant="label" tone={alert ? 'alert' : 'default'}>
        {label}
      </Text>
    </PressableSurface>
  );
}

export function ConfirmBox({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
  Heading = Plain,
  Description = Plain,
}: ConfirmBoxProps) {
  const { elevation } = useThemeTokens();
  const frame = { boxShadow: elevation.float, maxWidth: layout.dialog };
  return (
    <View
      style={frame}
      className="rounded-sheet bg-surface px-dialog-x pt-dialog-top pb-dialog-bottom w-full">
      <Heading>
        <Text variant="title">{title}</Text>
      </Heading>
      <View className="mt-dialog-body-top">
        <Description>
          <Text tone="2">{body}</Text>
        </Description>
      </View>
      <View className="mt-dialog-actions-top gap-dialog-actions-gap flex-row justify-end">
        <Act label={cancelLabel} onPress={onCancel} />
        <Act label={confirmLabel} alert={destructive} onPress={onConfirm} />
      </View>
    </View>
  );
}
