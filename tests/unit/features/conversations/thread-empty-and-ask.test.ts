import { describe, expect, test } from 'bun:test';
import { size } from '@/shared/theme/tokens';
import { emptyMarkSizeOf } from '@/features/conversations/model/conversation-layout';
import { asksYesNo } from '@/features/conversations/model/conversation-thread';

describe('the Estela of an empty thread', () => {
  test('scales down with the window height and on a phone on its side', () => {
    expect(emptyMarkSizeOf('regular', false)).toBe(size.presenceThreadEmpty);
    expect(emptyMarkSizeOf('short', false)).toBe(size.presenceWelcomeTiny);
    expect(emptyMarkSizeOf('tiny', false)).toBe(size.presenceMark);
    expect(emptyMarkSizeOf('regular', true)).toBe(size.presenceMark);
  });
});

describe('a closed question from Argus', () => {
  test('a closed question asks for yes or no, an open one does not', () => {
    expect(asksYesNo('¿Cancelo el recordatorio «Abrir la ventana»?')).toBe(true);
    expect(asksYesNo('Recordatorio guardado. ¿Te lo recuerdo mañana a las 9:30?')).toBe(true);
    expect(
      asksYesNo('No encontré un recordatorio de «estirar piernas». ¿Cuál quieres cancelar?')
    ).toBe(false);
    expect(asksYesNo('Shall I cancel it?')).toBe(true);
    expect(asksYesNo('Done. Which one do you mean?')).toBe(false);
    expect(asksYesNo('Borré el recordatorio.')).toBe(false);
    expect(asksYesNo(null)).toBe(false);
  });
});
