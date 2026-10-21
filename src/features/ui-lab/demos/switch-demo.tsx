import { useState } from 'react';
import { Switch } from '@/shared/ui/switch';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function SwitchDemo() {
  const [value, setValue] = useState(true);
  return (
    <>
      <LabCase id="off">
        <Switch value={false} label={copy.visitors} onValueChange={noop} />
      </LabCase>
      <LabCase id="on">
        <Switch value label={copy.calls} onValueChange={noop} />
      </LabCase>
      <LabCase id="toggle">
        <Switch value={value} label={copy.calls} onValueChange={setValue} />
      </LabCase>
      <LabCase id="disabled">
        <Switch value={false} label={copy.disabled} disabled onValueChange={noop} />
      </LabCase>
    </>
  );
}
