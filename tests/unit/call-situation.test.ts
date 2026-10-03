import { describe, expect, test } from 'bun:test';
import type { CalendarEntry } from '@/core/types';
import { buildCallSituation, clockOf, spokenDetail } from '@/features/voice/model/call-situation';

const t = ((key: string, params?: Record<string, string | number>) =>
  params ? `${key}${JSON.stringify(params)}` : key) as never;

const at = (hours: number, minutes: number): number => new Date(2026, 9, 3, hours, minutes).getTime();

const entry = (id: string, title: string, startsAt: number, extra: Partial<CalendarEntry> = {}): CalendarEntry => ({
  id,
  source: 'event',
  title,
  startsAt,
  endsAt: null,
  isAllDay: false,
  status: 'upcoming',
  ...extra,
});

describe('buildCallSituation', () => {
  test('says the guard mode, the pending agenda in order and the events of the call', () => {
    const text = buildCallSituation({
      t,
      guardMode: 'away',
      agenda: [
        entry('b', 'Cena', at(21, 0)),
        entry('a', 'Dentista', at(10, 0), { status: 'complete' }),
        entry('c', 'Cumpleaños', at(0, 0), { isAllDay: true }),
        entry('d', 'Llamada', at(19, 30)),
      ],
      agendaItems: 2,
      events: [{ camera: 'Entrada', what: 'una persona', at: at(18, 2) }],
      offlineCameras: ['Patio'],
    });
    expect(text.split('\n')).toEqual([
      'screens.voice.situation.header',
      'screens.voice.situation.guard-mode{"mode":"screens.voice.situation.modes.away"}',
      'screens.voice.situation.agenda-more{"items":"screens.voice.situation.all-day{\\"title\\":\\"Cumpleaños\\"}; 19:30 Llamada","count":"1"}',
      'screens.voice.situation.events{"items":"18:02 Entrada: una persona"}',
      'screens.voice.situation.offline{"names":"Patio"}',
    ]);
  });

  test('a free day says so and a role without the guard leaves the mode out', () => {
    const text = buildCallSituation({
      t,
      guardMode: null,
      agenda: [],
      agendaItems: 4,
      events: [],
      offlineCameras: [],
    });
    expect(text.split('\n')).toEqual(['screens.voice.situation.header', 'screens.voice.situation.agenda-empty']);
  });
});

describe('spoken helpers', () => {
  test('a clock is two-digit hours and minutes', () => {
    expect(clockOf(at(7, 5))).toBe('07:05');
  });

  test('a reason reads inside a sentence: lower first letter, no closing period', () => {
    expect(spokenDetail(' No tienes permiso para hacer esto. ')).toBe('no tienes permiso para hacer esto');
    expect(spokenDetail('...')).toBe('');
  });
});
