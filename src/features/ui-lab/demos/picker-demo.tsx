import { useState } from 'react';
import { View } from 'react-native';
import { usePickerLayout } from '@/shared/theme';
import { DateField, PickerCalendar, PickerClock, TimeField } from '@/shared/ui/picker';
import { LabCase } from '../components/lab-case';
import { pickerCopy } from './demo-copy';

const NOW = new Date(2026, 9, 27, 10, 0).getTime();

const TEN = 10 * 60;

const HOUR = 60;

export function PickerDemo() {
  const layout = usePickerLayout();
  const [day, setDay] = useState(NOW);
  const [time, setTime] = useState(TEN);
  const [end, setEnd] = useState(TEN + HOUR);
  return (
    <>
      <LabCase id="fields" block>
        <View>
          <DateField
            label={pickerCopy.starts}
            value={day}
            now={NOW}
            quick
            time={{ value: time, fallback: TEN, onChange: setTime }}
            onChange={setDay}
          />
          <TimeField label={pickerCopy.ends} value={end} fallback={TEN + HOUR} onChange={setEnd} />
        </View>
      </LabCase>
      <LabCase id="calendar" block>
        <View className="w-picker-width">
          <PickerCalendar value={day} min={NOW} now={NOW} layout={layout} onPick={setDay} />
        </View>
      </LabCase>
      <LabCase id="wheels" block>
        <PickerClock value={time} step={5} layout={layout} onChange={setTime} />
      </LabCase>
    </>
  );
}
