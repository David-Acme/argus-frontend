import { hasFinePointer, useWindowLayout } from '@/shared/theme';
import { pickerForm, type PickerForm } from './model/form';

export function usePickerForm(): PickerForm {
  const { navigation } = useWindowLayout();
  return pickerForm({ navigation, finePointer: hasFinePointer() });
}
