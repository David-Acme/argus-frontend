import type { Navigation } from '@/shared/theme';

export type PickerForm = 'inline' | 'popover' | 'desktop';

export type PickerFormInput = { navigation: Navigation; finePointer: boolean };

export function pickerForm({ navigation, finePointer }: PickerFormInput): PickerForm {
  if (finePointer) return 'desktop';
  return navigation === 'bar' ? 'inline' : 'popover';
}
