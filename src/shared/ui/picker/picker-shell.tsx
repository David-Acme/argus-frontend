import * as PopoverPrimitive from '@rn-primitives/popover';
import { space, useThemeTokens } from '@/shared/theme';
import { PickerInline, type PickerShellProps } from './picker-inline';
import { PICKER_ROW, PickerRowContent } from './picker-row';
import { usePickerForm } from './use-picker-form';

const INSETS = { top: space[2], bottom: space[2], left: space[2], right: space[2] };

function PickerPopover({ label, value, empty, testID, children }: PickerShellProps) {
  const { elevation } = useThemeTokens();
  const panel = { boxShadow: `${elevation.float}, ${elevation.ring}` };
  const { open, onOpenChange } = PopoverPrimitive.useRootContext();
  return (
    <>
      <PopoverPrimitive.Trigger
        aria-label={`${label}, ${value}`}
        aria-expanded={open}
        testID={testID}
        className={`${PICKER_ROW} web:focus-ring rounded-control`}>
        <PickerRowContent label={label} value={value} open={open} empty={empty} />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={space[1]}
          insets={INSETS}
          aria-label={label}
          style={panel}
          className="rounded-dialog bg-surface p-palette-group z-50">
          {children(() => onOpenChange(false), true)}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </>
  );
}

export function PickerShell(props: PickerShellProps) {
  const form = usePickerForm();
  if (form === 'inline') return <PickerInline {...props} />;
  return (
    <PopoverPrimitive.Root>
      <PickerPopover {...props} />
    </PopoverPrimitive.Root>
  );
}
