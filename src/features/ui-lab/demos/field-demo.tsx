import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { Field } from '@/shared/ui/field';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function FieldDemo() {
  const focused = useRef<TextInput>(null);
  const [title, setTitle] = useState<string>(copy.technician);
  const [notes, setNotes] = useState<string>(copy.notesValue);
  useEffect(() => focused.current?.focus(), []);
  return (
    <>
      <LabCase id="focus" block>
        <Field
          ref={focused}
          label={copy.titleLabel}
          value={title}
          onChangeText={setTitle}
          submit={{ key: 'next', onSubmit: noop }}
        />
      </LabCase>
      <LabCase id="label" block>
        <Field label={copy.titleLabel} value={copy.technician} onChangeText={noop} />
      </LabCase>
      <LabCase id="quick" block>
        <Field placeholder={copy.remindPrompt} value={copy.light} onChangeText={noop} />
      </LabCase>
      <LabCase id="multiline" block>
        <Field kind="multiline" label={copy.notes} value={notes} onChangeText={setNotes} />
      </LabCase>
      <LabCase id="error" block>
        <Field
          placeholder={copy.remindPrompt}
          value=""
          error={copy.remindError}
          onChangeText={noop}
        />
      </LabCase>
      <LabCase id="hint" block>
        <Field
          label={copy.emailLabel}
          content="email"
          hint={copy.emailHint}
          value=""
          onChangeText={noop}
          submit={{ key: 'done', onSubmit: noop }}
        />
      </LabCase>
      <LabCase id="secret" block>
        <Field kind="secret" content="pin" label={copy.pinLabel} value="2580" onChangeText={noop} />
      </LabCase>
    </>
  );
}
