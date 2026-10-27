import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { CodeField } from '@/shared/ui/field/code-field';
import { Field, type FieldProps } from '@/shared/ui/field/field';
import { FieldShell } from '@/shared/ui/field/field-shell';

type Kind = NonNullable<FieldProps['kind']>;

function Controlled({ kind }: { kind: Kind }) {
  const [value, setValue] = useState('');
  if (kind === 'code')
    return <Field kind="code" label="Código de vínculo" value={value} onChangeText={setValue} />;
  return <Field kind={kind} label="Título" value={value} onChangeText={setValue} />;
}

describe('Field', () => {
  test('a text field is a textbox named by its label and reports what is typed', () => {
    const typed: string[] = [];
    render(<Field label="Título" value="" onChangeText={(text) => typed.push(text)} />);
    expect(screen.getByText('Título')).toBeDefined();
    fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), {
      target: { value: 'Visita del técnico' },
    });
    expect(typed).toEqual(['Visita del técnico']);
  });

  test('without a visible label the placeholder names the field', () => {
    render(<Field placeholder="¿Qué quieres recordar?" value="" onChangeText={() => undefined} />);
    expect(screen.getByRole('textbox', { name: '¿Qué quieres recordar?' })).toBeDefined();
  });

  test('an error is announced under the field in words and replaces the hint', () => {
    render(
      <Field
        placeholder="¿Qué quieres recordar?"
        hint="Una frase corta"
        error="Escribe qué quieres recordar."
        value=""
        onChangeText={() => undefined}
      />
    );
    expect(screen.getByRole('alert').textContent).toBe('Escribe qué quieres recordar.');
    expect(screen.queryByText('Una frase corta')).toBeNull();
  });

  test('an error is spoken on native when it appears, since Android ignores role alert', () => {
    const announce = mock((_message: string) => undefined);
    AccessibilityInfo.announceForAccessibility = announce;
    const field = (error?: string) => (
      <Field placeholder="Título" error={error} value="" onChangeText={() => undefined} />
    );
    const { rerender } = render(field());
    expect(announce).not.toHaveBeenCalled();
    rerender(field('Escribe un título.'));
    expect(announce.mock.calls).toEqual([['Escribe un título.']]);
  });

  test('a hint shows under the field when there is no error', () => {
    render(
      <Field
        label="Correo"
        hint="Te escribimos solo para avisos"
        value=""
        onChangeText={() => undefined}
      />
    );
    expect(screen.getByText('Te escribimos solo para avisos')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('the Return key the form passes is Siguiente or done and runs its action', () => {
    let submitted = 0;
    render(
      <>
        <Field
          label="Título"
          value=""
          onChangeText={() => undefined}
          submit={{ key: 'next', onSubmit: () => (submitted += 1) }}
        />
        <Field
          label="Hora"
          value=""
          onChangeText={() => undefined}
          submit={{ key: 'done', onSubmit: () => (submitted += 10) }}
        />
      </>
    );
    const title = screen.getByRole('textbox', { name: 'Título' });
    expect(title.getAttribute('enterkeyhint')).toBe('next');
    expect(screen.getByRole('textbox', { name: 'Hora' }).getAttribute('enterkeyhint')).toBe('done');
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(submitted).toBe(1);
  });

  test('each kind gets its keyboard and autofill', () => {
    render(
      <>
        <Field label="Correo" content="email" value="" onChangeText={() => undefined} />
        <Field kind="secret" label="PIN" content="pin" value="" onChangeText={() => undefined} />
        <Field kind="secret" label="Contraseña" value="" onChangeText={() => undefined} />
      </>
    );
    const email = screen.getByRole('textbox', { name: 'Correo' });
    expect(email.getAttribute('inputmode')).toBe('email');
    expect(email.getAttribute('autocomplete')).toBe('email');
    const pin = screen.getByLabelText('PIN');
    expect(pin.getAttribute('type')).toBe('password');
    expect(pin.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe(
      'current-password'
    );
  });

  test('names, a typed code and an address get their own autofill and keyboard', () => {
    render(
      <>
        <Field label="Nombre" content="given" value="" onChangeText={() => undefined} />
        <Field label="Apellido" content="family" value="" onChangeText={() => undefined} />
        <Field label="Código" content="code" value="" onChangeText={() => undefined} />
        <Field label="Dirección" content="address" value="" onChangeText={() => undefined} />
      </>
    );
    expect(screen.getByRole('textbox', { name: 'Nombre' }).getAttribute('autocomplete')).toBe(
      'given-name'
    );
    expect(screen.getByRole('textbox', { name: 'Apellido' }).getAttribute('autocomplete')).toBe(
      'family-name'
    );
    expect(screen.getByRole('textbox', { name: 'Código' }).getAttribute('autocapitalize')).toBe(
      'characters'
    );
    expect(screen.getByRole('textbox', { name: 'Dirección' }).getAttribute('inputmode')).toBe(
      'url'
    );
  });

  test('a multiline field is a text area', () => {
    render(<Controlled kind="multiline" />);
    expect(screen.getByRole('textbox', { name: 'Título' }).tagName).toBe('TEXTAREA');
  });

  test('the code field fills six boxes in capitals and stops at six', () => {
    render(<Controlled kind="code" />);
    const input = screen.getByLabelText('Código de vínculo');
    expect(input.getAttribute('maxlength')).toBe('6');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    fireEvent.change(input, { target: { value: 'k7q' } });
    expect(screen.getByText('K')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('Q')).toBeDefined();
  });

  test('a code error is announced', () => {
    render(
      <CodeField
        kind="code"
        label="Código de vínculo"
        value="K7Q4"
        error="Ese código no es de este Argus."
        onChangeText={() => undefined}
      />
    );
    expect(screen.getByRole('alert').textContent).toBe('Ese código no es de este Argus.');
  });

  test('the shell shows a label above what it wraps', () => {
    render(
      <FieldShell label="Repetir">
        <></>
      </FieldShell>
    );
    expect(screen.getByText('Repetir')).toBeDefined();
  });

  test('focus and blur keep the field usable', () => {
    render(<Controlled kind="text" />);
    const input = screen.getByRole('textbox', { name: 'Título' });
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input).toBeDefined();
  });

  test('a message field sends on Enter on the web and keeps Shift+Enter for a new line', () => {
    const sent: string[] = [];
    render(
      <Field
        kind="message"
        placeholder="Escríbele a Argus"
        value="Hola"
        onChangeText={() => undefined}
        submit={{ key: 'done', onSubmit: () => sent.push('send') }}
      />
    );
    const input = screen.getByRole('textbox', { name: 'Escríbele a Argus' });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(sent).toEqual([]);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(sent).toEqual(['send']);
  });
});
