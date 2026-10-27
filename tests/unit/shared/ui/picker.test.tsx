import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import './translation-stub';
import { setWindowWidth } from './window-width';

const clock = { hour12: false, fine: false };

const formatter = () =>
  createDateFormatter(clock.hour12 ? 'en' : 'es', {
    languageTag: clock.hour12 ? 'en-US' : 'es-PE',
    regionCode: clock.hour12 ? 'US' : 'PE',
    uses24hourClock: !clock.hour12,
    firstWeekday: clock.hour12 ? 1 : 2,
    timeZone: 'America/Lima',
  });

mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: formatter }));
mock.module('@/shared/theme/pointer', () => ({ hasFinePointer: () => clock.fine }));

const { DateField } = await import('@/shared/ui/picker/date-field');
const { TimeField } = await import('@/shared/ui/picker/time-field');
const { PickerCalendar } = await import('@/shared/ui/picker/picker-calendar');
const { PickerClock } = await import('@/shared/ui/picker/picker-clock');
const { PickerInline } = await import('@/shared/ui/picker/picker-inline');
const { PickerRowContent } = await import('@/shared/ui/picker/picker-row');
const { PickerShell } = await import('@/shared/ui/picker/picker-shell');
const { PickerShell: NativeShell } = await import('@/shared/ui/picker/picker-shell.native');
const { Wheel } = await import('@/shared/ui/picker/wheel');
const { DesktopDateField, DesktopTimeField } = await import('@/shared/ui/picker/desktop-fields');
const { DesktopShell } = await import('@/shared/ui/picker/desktop-popover');
const { SegmentInput } = await import('@/shared/ui/picker/segment-input');
const { TimeList } = await import('@/shared/ui/picker/time-list');
const { useDateSegments } = await import('@/shared/ui/picker/desktop-segments');
const { usePickerForm } = await import('@/shared/ui/picker/use-picker-form');
const { focusDay } = await import('@/shared/ui/picker/focus-day');
const { CalendarHead, MonthWheels } = await import('@/shared/ui/picker/picker-calendar-head');

const finePointer = (fine: boolean) => {
  clock.fine = fine;
};

finePointer(false);

const LAYOUT = { rows: 5, day: 40 };

const day = (date: number) => new Date(2026, 9, date).getTime();

const NOW = day(27) + 10 * 3_600_000;

afterEach(() => {
  clock.hour12 = false;
  finePointer(false);
  setWindowWidth(360);
});

describe('DateField', () => {
  test('the compact row shows the value and expands the month in place', () => {
    const picked: number[] = [];
    render(<DateField label="Día" value={day(27)} now={NOW} onChange={(at) => picked.push(at)} />);
    const row = screen.getByRole('button', { name: 'Día, mar, 27 oct' });
    expect(row.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('grid')).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: formatter().formatFullDate(new Date(day(29))) })
    );
    expect(picked).toEqual([day(29)]);
    expect(screen.queryByRole('grid')).toBeNull();
  });

  test('the week starts on the locale day, Monday for Peru', () => {
    render(<DateField label="Día" value={day(27)} now={NOW} onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /^Día, / }));
    const first = screen.getAllByRole('row')[0]?.querySelector('[role="button"]');
    expect(first?.getAttribute('aria-label')).toContain('lunes');
  });

  test('the past is muted and cannot be picked when the field forbids it', () => {
    const picked: number[] = [];
    render(
      <DateField
        label="Día"
        value={day(27)}
        now={NOW}
        min={NOW}
        onChange={(at) => picked.push(at)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Día, / }));
    const past = screen.getByRole('button', {
      name: formatter().formatFullDate(new Date(day(20))),
    });
    fireEvent.click(past);
    expect(picked).toEqual([]);
  });

  test('the quick chips pick today, tomorrow and the weekend', () => {
    const picked: number[] = [];
    render(
      <DateField label="Día" value={day(27)} now={NOW} quick onChange={(at) => picked.push(at)} />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Día, / }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Este fin de semana' }));
    expect(picked).toEqual([day(31)]);
  });

  test('the chevrons change month and the title opens the month and year wheels', () => {
    render(<DateField label="Día" value={day(27)} now={NOW} onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /^Día, / }));
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    const title = screen.getByRole('button', { name: /noviembre 2026/i });
    fireEvent.click(title);
    expect(screen.getByRole('slider', { name: 'Mes' }).getAttribute('aria-valuetext')).toMatch(
      /noviembre/i
    );
    expect(screen.getByRole('slider', { name: 'Año' }).getAttribute('aria-valuetext')).toBe('2026');
  });

  test('a cleared field says it has no date', () => {
    render(<DateField label="Vence" value={null} now={NOW} onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Vence, Sin fecha' })).toBeDefined();
  });

  test('a wide touch window opens the month in a popover anchored at the field', async () => {
    setWindowWidth(1280);
    render(<DateField label="Día" value={day(27)} now={NOW} onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /^Día, / }));
    const popover = await screen.findByRole('dialog');
    expect(popover.querySelector('[role="grid"]')).not.toBeNull();
  });
});

describe('TimeField', () => {
  test('the wheels answer the arrow keys and typed digits, five minutes a step', () => {
    const changes: number[] = [];
    render(
      <TimeField
        label="Hora"
        value={10 * 60}
        fallback={0}
        onChange={(minutes) => changes.push(minutes)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hora, 10:00' }));
    const hour = screen.getByRole('slider', { name: 'Hora' });
    const minute = screen.getByRole('slider', { name: 'Minutos' });
    expect(minute.getAttribute('aria-valuemax')).toBe('11');
    fireEvent.keyDown(hour, { key: 'ArrowDown' });
    fireEvent.keyDown(minute, { key: '3' });
    expect(changes).toEqual([11 * 60, 10 * 60 + 30]);
    expect(screen.queryByRole('slider', { name: 'Mañana o tarde' })).toBeNull();
  });

  test('a 12 h locale adds the AM and PM wheel', () => {
    clock.hour12 = true;
    const changes: number[] = [];
    render(
      <TimeField
        label="Hora"
        value={9 * 60}
        fallback={0}
        onChange={(minutes) => changes.push(minutes)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hora, 9:00 AM' }));
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Mañana o tarde' }), { key: 'ArrowDown' });
    expect(changes).toEqual([21 * 60]);
  });

  test('an optional time can be removed', () => {
    let cleared = 0;
    render(
      <TimeField
        label="Termina"
        value={11 * 60}
        fallback={0}
        onChange={() => undefined}
        onClear={() => (cleared += 1)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Termina, / }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(cleared).toBe(1);
  });
});

describe('picker parts', () => {
  test('a wheel is a named slider that steps, jumps and takes a mouse wheel', () => {
    const picked: number[] = [];
    render(
      <Wheel
        label="Minutos"
        items={['00', '15', '30', '45']}
        index={1}
        rows={3}
        onChange={(index) => picked.push(index)}
      />
    );
    const wheel = screen.getByRole('slider', { name: 'Minutos' });
    expect(wheel.getAttribute('aria-valuetext')).toBe('15');
    fireEvent.keyDown(wheel, { key: 'End' });
    fireEvent.keyDown(wheel, { key: 'ArrowUp' });
    fireEvent.wheel(wheel, { deltaY: 40 });
    expect(picked).toEqual([3, 0, 2]);
  });

  test('the calendar marks the selected day and swaps to wheels from its title', () => {
    render(
      <PickerCalendar
        value={day(27)}
        min={null}
        now={NOW}
        layout={LAYOUT}
        onPick={() => undefined}
      />
    );
    const selected = screen.getByRole('button', {
      name: formatter().formatFullDate(new Date(day(27))),
    });
    expect(selected.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /octubre 2026/i }));
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });

  test('the clock reads 24 h as two wheels', () => {
    render(<PickerClock value={8 * 60 + 5} step={5} layout={LAYOUT} onChange={() => undefined} />);
    expect(screen.getByRole('slider', { name: 'Hora' }).getAttribute('aria-valuetext')).toBe('08');
    expect(screen.getByRole('slider', { name: 'Minutos' }).getAttribute('aria-valuetext')).toBe(
      '05'
    );
  });

  test('the row shows its label and its value, quiet when empty', () => {
    render(<PickerRowContent label="Vence" value="Sin fecha" open={false} empty />);
    expect(screen.getByText('Vence')).toBeDefined();
    expect(screen.getByText('Sin fecha')).toBeDefined();
  });

  test('inline, the shell opens below its row and closes from inside', () => {
    render(
      <PickerInline label="Día" value="mar" empty={false}>
        {(close) => (
          <button type="button" onClick={close}>
            cerrar
          </button>
        )}
      </PickerInline>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Día, mar' }));
    fireEvent.click(screen.getByRole('button', { name: 'cerrar' }));
    expect(screen.queryByRole('button', { name: 'cerrar' })).toBeNull();
  });

  test('on a phone the web shell and the native shell both expand in place', () => {
    for (const Shell of [PickerShell, NativeShell]) {
      const { unmount } = render(
        <Shell label="Hora" value="10:00" empty={false}>
          {() => <span>ruedas</span>}
        </Shell>
      );
      fireEvent.click(screen.getByRole('button', { name: 'Hora, 10:00' }));
      expect(screen.getByText('ruedas')).toBeDefined();
      unmount();
    }
  });
});

describe('the desktop form', () => {
  test('a fine pointer turns the field into typeable segments, even in a narrow window', () => {
    finePointer(true);
    function Probe() {
      return <span>{usePickerForm()}</span>;
    }
    render(<Probe />);
    expect(screen.getByText('desktop')).toBeDefined();
  });

  test('typing the segments in locale order commits a real date and moves from one to the next', () => {
    finePointer(true);
    const picked: number[] = [];
    render(<DateField label="Día" value={day(27)} now={NOW} onChange={(at) => picked.push(at)} />);
    const [first, second] = screen.getAllByRole('spinbutton');
    expect(first?.getAttribute('aria-label')).toBe('Día');
    expect(second?.getAttribute('aria-label')).toBe('Mes');
    fireEvent.keyDown(first as HTMLElement, { key: '0' });
    fireEvent.keyDown(first as HTMLElement, { key: '3' });
    expect(picked.at(-1)).toBe(day(3));
    expect(document.activeElement).toBe(second as HTMLElement);
    fireEvent.keyDown(second as HTMLElement, { key: 'ArrowUp' });
    expect(picked.at(-1)).toBe(new Date(2026, 10, 27).getTime());
  });

  test('an impossible date keeps the draft and says so', () => {
    finePointer(true);
    const picked: number[] = [];
    render(
      <DateField
        label="Día"
        value={new Date(2026, 1, 10).getTime()}
        now={NOW}
        onChange={(at) => picked.push(at)}
      />
    );
    const [dayPart] = screen.getAllByRole('spinbutton');
    fireEvent.keyDown(dayPart as HTMLElement, { key: '3' });
    fireEvent.keyDown(dayPart as HTMLElement, { key: '1' });
    expect(picked).toEqual([]);
    expect(screen.getByText('Esa fecha no existe. Revisa el día y el mes.')).toBeDefined();
  });

  test('the calendar button opens a dropdown with Hoy, and the arrows walk the grid', async () => {
    finePointer(true);
    const picked: number[] = [];
    render(
      <DesktopDateField label="Día" value={day(27)} now={NOW} onChange={(at) => picked.push(at)} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el calendario' }));
    const grid = await screen.findByRole('grid');
    const date = formatter();
    const today = screen.getByRole('button', { name: date.formatFullDate(new Date(day(27))) });
    expect(today.getAttribute('tabindex')).not.toBe('-1');
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      date.formatFullDate(new Date(day(28)))
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(picked).toEqual([day(27)]);
  });

  test('a date with a time types both and lists the times in quarters', async () => {
    finePointer(true);
    const times: number[] = [];
    render(
      <DesktopDateField
        label="Empieza"
        value={day(27)}
        now={NOW}
        onChange={() => undefined}
        time={{ value: 10 * 60, fallback: 9 * 60, onChange: (minutes) => times.push(minutes) }}
      />
    );
    expect(screen.getAllByRole('spinbutton')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el calendario' }));
    fireEvent.click(await screen.findByRole('radio', { name: '10:15' }));
    expect(times).toEqual([10 * 60 + 15]);
  });

  test('the desktop time field types hours and minutes and offers its list', async () => {
    finePointer(true);
    const times: number[] = [];
    render(
      <DesktopTimeField
        label="Termina"
        value={null}
        fallback={11 * 60}
        onChange={(minutes) => times.push(minutes)}
      />
    );
    const [hour, minute] = screen.getAllByRole('spinbutton');
    fireEvent.keyDown(hour as HTMLElement, { key: '1' });
    fireEvent.keyDown(hour as HTMLElement, { key: '8' });
    fireEvent.keyDown(minute as HTMLElement, { key: '3' });
    fireEvent.keyDown(minute as HTMLElement, { key: '0' });
    expect(times.at(-1)).toBe(18 * 60 + 30);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir de la lista de horas' }));
    expect(await screen.findByRole('radiogroup', { name: 'Horas' })).toBeDefined();
  });

  test('the parts render alone: the shell, the segments, the list, the hook and the focus helper', () => {
    const changes: string[] = [];
    function Probe() {
      const draft = useDateSegments(day(27), () => true);
      return (
        <DesktopShell
          label="Día"
          opener="Abrir"
          icon="cal"
          error="Mal"
          segments={
            <SegmentInput
              segments={draft.segments}
              separator={() => '/'}
              onChange={(part) => changes.push(part)}
            />
          }>
          {() => null}
        </DesktopShell>
      );
    }
    render(<Probe />);
    expect(screen.getByText('Mal')).toBeDefined();
    fireEvent.keyDown(screen.getAllByRole('spinbutton')[2] as HTMLElement, { key: 'Backspace' });
    expect(changes).toEqual(['year']);
    render(<TimeList label="Horas" value={null} fallback={0} step={30} onPick={() => undefined} />);
    expect(screen.getAllByRole('radio')).toHaveLength(48);
    focusDay(null, 'nada');
  });
});

describe('the calendar head', () => {
  test('the title names the month, and the chevrons shift it unless the wheels are open', () => {
    const steps: number[] = [];
    const { rerender } = render(
      <CalendarHead
        month={{ year: 2026, month: 9 }}
        choosing={false}
        onChoose={() => undefined}
        onShift={(step) => steps.push(step)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(steps).toEqual([-1]);
    rerender(
      <CalendarHead
        month={{ year: 2026, month: 9 }}
        choosing
        onChoose={() => undefined}
        onShift={() => undefined}
      />
    );
    expect(screen.queryByRole('button', { name: 'Mes anterior' })).toBeNull();
    render(
      <MonthWheels month={{ year: 2026, month: 9 }} now={NOW} rows={3} onChange={() => undefined} />
    );
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });
});
