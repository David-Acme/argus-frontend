import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { usePickerLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { DesktopTimeField } from './desktop-fields';
import { PickerClock } from './picker-clock';
import { PickerShell } from './picker-shell';
import type { TimeFieldProps } from './picker-types';
import { usePickerForm } from './use-picker-form';

const FIVE = 5;

const HOUR = 60;

function TouchTimeField({
  label,
  value,
  fallback,
  onChange,
  step = FIVE,
  onClear,
  testID,
}: TimeFieldProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const layout = usePickerLayout();
  const shown =
    value === null
      ? t('common.picker.no-time')
      : date.formatTime(new Date(2000, 0, 1, Math.floor(value / HOUR), value % HOUR));
  return (
    <PickerShell label={label} value={shown} empty={value === null} testID={testID}>
      {(close) => (
        <View className="gap-row-trail-gap">
          <PickerClock value={value ?? fallback} step={step} layout={layout} onChange={onChange} />
          {onClear && value !== null ? (
            <Button
              variant="ghost"
              compact
              label={t('common.picker.clear')}
              onPress={() => {
                onClear();
                close();
              }}
            />
          ) : null}
        </View>
      )}
    </PickerShell>
  );
}

export function TimeField(props: TimeFieldProps) {
  const form = usePickerForm();
  if (form === 'desktop') return <DesktopTimeField {...props} />;
  return <TouchTimeField {...props} />;
}
