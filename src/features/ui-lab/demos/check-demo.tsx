import { useState } from 'react';
import { Check, type CheckState } from '@/shared/ui/check';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

export function CheckDemo() {
  const [state, setState] = useState<CheckState>('open');
  return (
    <>
      <LabCase id="open">
        <Check state="open" label={copy.light} />
      </LabCase>
      <LabCase id="overdue">
        <Check state="overdue" label={copy.plumber} />
      </LabCase>
      <LabCase id="progress">
        <Check state="progress" label={copy.boxes} />
      </LabCase>
      <LabCase id="done">
        <Check state="done" label={copy.yoga} />
      </LabCase>
      <LabCase id="toggle">
        <Check
          state={state}
          label={copy.light}
          onToggle={() => setState(state === 'done' ? 'open' : 'done')}
        />
      </LabCase>
    </>
  );
}
