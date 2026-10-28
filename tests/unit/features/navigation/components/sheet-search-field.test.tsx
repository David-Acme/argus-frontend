import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '../../../shared/ui/translation-stub';

const { SheetSearchField } = await import('@/features/navigation/components/sheet-search-field');

describe('the search field of a half-height sheet', () => {
  test('closed, it is one button that asks to open and never takes the keyboard', () => {
    const opened: string[] = [];
    render(
      <SheetSearchField
        label="Buscar en Argus"
        value=""
        open={false}
        onOpen={() => opened.push('open')}
        onChangeText={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en Argus' }));
    expect(opened).toEqual(['open']);
    expect(document.activeElement).not.toBe(screen.getByPlaceholderText('Buscar en Argus'));
  });

  test('open, it is the field itself and takes focus once the sheet has grown', async () => {
    const typed: string[] = [];
    render(
      <SheetSearchField
        label="Buscar en Argus"
        value=""
        open
        onOpen={() => undefined}
        onChangeText={(text) => typed.push(text)}
      />
    );
    const field = screen.getByPlaceholderText('Buscar en Argus');
    expect(document.activeElement).not.toBe(field);
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: 'cocina' } });
    expect(typed).toEqual(['cocina']);
  });
});
