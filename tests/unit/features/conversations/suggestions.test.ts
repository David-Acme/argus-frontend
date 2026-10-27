import { describe, expect, test } from 'bun:test';
import { size } from '@/shared/theme/tokens';
import {
  asksYesNo,
  cameraToSuggest,
  emptyMarkSizeOf,
  suggestionsOf,
} from '@/features/conversations/model/suggestions';
import type { SuggestionInput } from '@/features/conversations/model/suggestions';

const ALL: Omit<SuggestionInput, 'hour'> = {
  cameraName: 'Cocina',
  readsPresence: true,
  setsMode: true,
  readsAgenda: true,
  asking: false,
};

const ids = (hour: number, patch: Partial<typeof ALL> = {}) =>
  suggestionsOf({ ...ALL, ...patch, hour }).map((suggestion) => suggestion.id);

describe('the suggestions above the composer', () => {
  test('three at most, ordered by the time of day', () => {
    expect(ids(8)).toEqual(['today', 'show-camera', 'who-home']);
    expect(ids(15)).toEqual(['show-camera', 'who-home', 'today']);
    expect(ids(21)).toEqual(['night-mode', 'show-camera', 'tomorrow']);
  });

  test('only what the role can ask, with «Recuérdame…» as the draft that fills the gap', () => {
    expect(
      ids(21, { cameraName: null, readsPresence: false, setsMode: false, readsAgenda: false })
    ).toEqual(['remind']);
    const [remind] = suggestionsOf({
      cameraName: null,
      readsPresence: false,
      setsMode: false,
      readsAgenda: false,
      hour: 9,
      asking: false,
    });
    expect(remind).toEqual({ id: 'remind', camera: null, send: false });
  });

  test('the camera suggestion names the camera', () => {
    expect(suggestionsOf({ ...ALL, hour: 15 })[0]).toEqual({
      id: 'show-camera',
      camera: 'Cocina',
      send: true,
    });
  });
});

describe('the Estela of an empty thread', () => {
  test('scales down with the window height and on a phone on its side', () => {
    expect(emptyMarkSizeOf('regular', false)).toBe(size.presenceThreadEmpty);
    expect(emptyMarkSizeOf('short', false)).toBe(size.presenceWelcomeTiny);
    expect(emptyMarkSizeOf('tiny', false)).toBe(size.presenceMark);
    expect(emptyMarkSizeOf('regular', true)).toBe(size.presenceMark);
  });
});

describe('suggestions that follow the conversation', () => {
  test('while Argus waits for a yes or a no, the chips are Sí and No', () => {
    expect(ids(15, { asking: true })).toEqual(['yes', 'no']);
  });

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

  test('the camera just shown is not offered again; another one is, or none', () => {
    expect(cameraToSuggest(['Cocina', 'Patio'], 'Cocina')).toBe('Patio');
    expect(cameraToSuggest(['Cocina'], 'Cocina')).toBeNull();
    expect(cameraToSuggest(['Cocina'], null)).toBe('Cocina');
  });
});
