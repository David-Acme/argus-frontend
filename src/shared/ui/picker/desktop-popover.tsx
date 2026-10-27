import * as PopoverPrimitive from '@rn-primitives/popover';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useOverlayBack } from '@/shared/components/ui/overlay-back';
import { space, useThemeTokens } from '@/shared/theme';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';

export type DesktopShellProps = {
  label: string;
  opener: string;
  icon: IconGlyph;
  error: string | null;
  testID?: string;
  segments: ReactNode;
  children: (close: () => void) => ReactNode;
};

type PanelProps = Pick<DesktopShellProps, 'label' | 'children'>;

const INSETS = { top: space[2], bottom: space[2], left: space[2], right: space[2] };

function Panel({ label, children }: PanelProps) {
  const { elevation } = useThemeTokens();
  const { open, onOpenChange } = PopoverPrimitive.useRootContext();
  useOverlayBack(open, true, () => onOpenChange(false));
  const panel = { boxShadow: `${elevation.float}, ${elevation.ring}` };
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        side="bottom"
        align="end"
        sideOffset={space[1]}
        insets={INSETS}
        aria-label={label}
        style={panel}
        className="rounded-dialog bg-surface p-palette-group z-50">
        {children(() => onOpenChange(false))}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export function DesktopShell({
  label,
  opener,
  icon,
  error,
  testID,
  segments,
  children,
}: DesktopShellProps) {
  return (
    <View testID={testID}>
      <View className="min-h-field gap-row-gap flex-row items-center">
        <View className="min-w-0 flex-1">
          <Text variant="control">{label}</Text>
        </View>
        <PopoverPrimitive.Root>
          <View
            className={
              error
                ? 'bg-alert-soft rounded-control px-palette-group flex-row items-center gap-1'
                : 'bg-fill rounded-control px-palette-group flex-row items-center gap-1'
            }>
            {segments}
            <PopoverPrimitive.Trigger
              aria-label={opener}
              className="size-target-min web:focus-ring web:hover:bg-fill-press rounded-control items-center justify-center">
              <Icon name={icon} size="small" tone="text-2" />
            </PopoverPrimitive.Trigger>
          </View>
          <Panel label={label}>{children}</Panel>
        </PopoverPrimitive.Root>
      </View>
      {error ? (
        <Text variant="meta" tone="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
