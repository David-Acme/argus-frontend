import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ChoiceList, ChoiceOpener } from '@/shared/ui/choice/choice-list';
import { Segmented } from '@/shared/ui/choice/segmented';
import { segmentWidth, segmentsFit } from '@/shared/ui/choice/segments-fit';
import './translation-stub';

const { Choice } = await import('@/shared/ui/choice/choice');

const MODES = [
  { value: 'home', label: 'Casa', icon: 'home' },
  { value: 'night', label: 'Noche', icon: 'moon' },
  { value: 'away', label: 'Fuera' },
  { value: 'armed', label: 'Armado' },
] as const;

const REPEAT = [
  { value: 'never', label: 'No se repite' },
  { value: 'daily', label: 'Cada día' },
  { value: 'weekly', label: 'Cada semana' },
  { value: 'monthly', label: 'Cada mes' },
  { value: 'yearly', label: 'Cada año' },
] as const;

describe('Choice', () => {
  test('four short options render as a radio group with the selected one checked', () => {
    const picked: string[] = [];
    render(
      <Choice label="Modo" options={MODES} value="home" onChange={(next) => picked.push(next)} />
    );
    expect(screen.getByRole('radiogroup', { name: 'Modo' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Casa' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Noche' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('radio', { name: 'Noche' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Casa' }));
    expect(picked).toEqual(['night']);
  });

  test('more than four options become a row that opens the list in the sheet', () => {
    function Repeat() {
      const [value, setValue] = useState<(typeof REPEAT)[number]['value']>('never');
      return <Choice label="Repetir" options={REPEAT} value={value} onChange={setValue} />;
    }
    render(<Repeat />);
    expect(screen.queryByRole('radiogroup', { name: 'Repetir' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Repetir, No se repite' }));
    expect(screen.getByRole('dialog', { name: 'Repetir' })).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: 'Cada mes' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Repetir, Cada mes' })).toBeDefined();
  });

  test('the sheet closes from its own dismissal without a change', () => {
    const picked: string[] = [];
    render(
      <Choice
        label="Repetir"
        look="field"
        options={REPEAT}
        value="never"
        onChange={(next) => picked.push(next)}
      />
    );
    expect(screen.getByText('Repetir')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Repetir, No se repite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(picked).toEqual([]);
  });

  test('a glass segmented control keeps its radios', () => {
    render(
      <Segmented
        label="Idioma"
        glass
        options={[
          { value: 'es', label: 'ES' },
          { value: 'en', label: 'EN' },
        ]}
        value="es"
        onChange={() => undefined}
      />
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  test('the list marks the current option and picks another', () => {
    const picked: string[] = [];
    render(<ChoiceList options={REPEAT} value="daily" onPick={(next) => picked.push(next)} />);
    expect(screen.getByRole('radio', { name: 'Cada día' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Cada año' }));
    expect(picked).toEqual(['yearly']);
  });

  test('the row opener names the choice and its value', () => {
    let opened = 0;
    render(
      <ChoiceOpener
        label="Llamadas de Argus"
        current="Solo alertas"
        look="row"
        onOpen={() => (opened += 1)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Llamadas de Argus, Solo alertas' }));
    expect(opened).toBe(1);
  });
});

describe('segmentsFit', () => {
  test('options fit when every label has room inside its segment', () => {
    expect(segmentsFit({ width: 328, contentWidths: [59, 66, 40, 52] })).toBe(true);
  });

  test('a label wider than its segment does not fit, so nothing truncates', () => {
    const room = segmentWidth(240, 3);
    expect(segmentsFit({ width: 240, contentWidths: [40, room, 40] })).toBe(false);
  });

  test('five options never fit, and an unmeasured width assumes they do', () => {
    expect(segmentsFit({ width: 1000, contentWidths: [1, 1, 1, 1, 1] })).toBe(false);
    expect(segmentsFit({ width: 0, contentWidths: [10, 10] })).toBe(true);
  });
});
