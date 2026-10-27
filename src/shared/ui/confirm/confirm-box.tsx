import type { ComponentType, ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
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
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  Heading?: ComponentType<FrameProps>;
  Description?: ComponentType<FrameProps>;
};

type ActProps = { label: string; alert?: boolean; busy?: boolean; onPress: () => void };

function Plain({ children }: FrameProps) {
  return <View>{children}</View>;
}

function Act({ label, alert, busy, onPress }: ActProps) {
  return (
    <PressableSurface
      a11y={{ label, role: 'button', busy }}
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
  busy,
  onConfirm,
  onCancel,
  Heading = Plain,
  Description = Plain,
}: ConfirmBoxProps) {
  const { elevation } = useThemeTokens();
  const { height } = useWindowDimensions();
  const frame = {
    boxShadow: elevation.float,
    maxWidth: layout.dialog,
    maxHeight: height - layout.gutterMedium * 2,
  };
  return (
    <View
      style={frame}
      className="rounded-sheet bg-surface px-dialog-x pt-dialog-top pb-dialog-bottom w-full">
      <Heading>
        <Text variant="title">{title}</Text>
      </Heading>
      <ScrollView className="mt-dialog-body-top min-h-0 shrink grow-0">
        <Description>
          <Text tone="2">{body}</Text>
        </Description>
      </ScrollView>
      <View className="mt-dialog-actions-top gap-dialog-actions-gap flex-row justify-end">
        <Act label={cancelLabel} onPress={onCancel} />
        <Act label={confirmLabel} alert={destructive} busy={busy} onPress={onConfirm} />
      </View>
    </View>
  );
}
