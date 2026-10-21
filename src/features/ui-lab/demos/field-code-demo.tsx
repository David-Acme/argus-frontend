import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { Field } from '@/shared/ui/field';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function FieldCodeDemo() {
  const focused = useRef<TextInput>(null);
  const [code, setCode] = useState('K7Q');
  useEffect(() => focused.current?.focus(), []);
  return (
    <>
      <LabCase id="typing" block>
        <Field
          kind="code"
          ref={focused}
          label={copy.pairingCode}
          value={code}
          onChangeText={setCode}
        />
      </LabCase>
      <LabCase id="empty" block>
        <Field kind="code" label={copy.pairingCode} value="" onChangeText={noop} />
      </LabCase>
      <LabCase id="error" block>
        <Field
          kind="code"
          label={copy.pairingCode}
          value="K7Q4ZP"
          error={copy.codeError}
          onChangeText={noop}
        />
      </LabCase>
    </>
  );
}
