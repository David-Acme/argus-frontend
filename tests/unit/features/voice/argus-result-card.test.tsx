import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { Text } from '@/shared/ui/text';
import type { ResultActions } from '@/features/voice/hooks/use-result-actions';
import type { ArgusResult } from '@/features/voice/model/argus-result';
import '../../shared/ui/translation-stub';
import { setWindowSize } from '../../shared/ui/window-width';

const calls: string[] = [];

const NOW = new Date(2026, 9, 26, 21, 54).getTime();

const TOMORROW_9 = new Date(2026, 9, 27, 9, 0).getTime();

mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () =>
    createDateFormatter('es', {
      languageTag: 'es-PE',
      regionCode: 'PE',
      uses24hourClock: true,
      firstWeekday: 2,
      timeZone: null,
    }),
}));
mock.module('@/features/cameras', () => ({
  CameraLiveView: ({ cameraId }: { cameraId: string }) => <Text>{`video ${cameraId}`}</Text>,
  useCameraPrivacy: () => 'off',
}));
mock.module('@/features/voice/hooks/use-argus-results', () => ({
  useArgusResults: () => [
    { id: 'old', at: NOW - 60_000, status: 'done', kind: 'camera', cameraId: 'c1', name: 'Patio' },
    { id: 'new', at: NOW + 1, status: 'done', kind: 'camera', cameraId: 'c2', name: 'Cocina' },
  ],
}));
mock.module('@/features/voice/hooks/use-result-actions', () => ({
  useResultActions: () => actionsOf('call'),
}));
mock.module('@/shared/hooks/use-now', () => ({ useNow: () => NOW }));

const { ArgusResultCard } = await import('@/features/voice/components/results/argus-result-card');
const { CallResults } = await import('@/features/voice/components/results/call-results');
const { CameraResultCard } = await import('@/features/voice/components/results/camera-result-card');
const { GuardModeCard } = await import('@/features/voice/components/results/home-result-cards');
const { ResultHead, ResultShell } =
  await import('@/features/voice/components/results/result-shell');
const { AgendaDayCard } = await import('@/features/voice/components/results/schedule-result-cards');

function actionsOf(surface: ResultActions['surface']): ResultActions {
  return {
    surface,
    openCamera: (id) => calls.push(`camera ${id}`),
    talk: surface === 'chat' ? (id) => calls.push(`talk ${id}`) : null,
    openAgenda: (at) => calls.push(`agenda ${at}`),
    openSecurity: () => calls.push('security'),
    openScreen: (result) => calls.push(`screen ${result.screen}`),
    undoEvent: (result) => {
      calls.push(`undo event ${result.eventId}`);
      return Promise.resolve();
    },
    undoMode: (result) => {
      calls.push(`undo mode ${result.previousMode ?? ''}`);
      return Promise.resolve();
    },
    answer: surface === 'chat' ? (_result, yes) => calls.push(`answer ${yes}`) : null,
  };
}

const show = async (node: ReactNode) => {
  await act(async () => {
    render(<>{node}</>);
  });
};

const card = (result: ArgusResult, surface: ResultActions['surface'] = 'chat', live = false) => (
  <ArgusResultCard result={result} live={live} now={NOW} actions={actionsOf(surface)} />
);

const base = { id: 'r', at: NOW, status: 'done' as const };

beforeEach(() => {
  calls.length = 0;
});

describe('what Argus did, as a card', () => {
  test('a camera Argus shows plays live with «Argus mira», Ver en grande and Hablar', async () => {
    await show(card({ ...base, kind: 'camera', cameraId: 'c2', name: 'Cocina' }, 'chat', true));
    expect(screen.getByText('video c2')).toBeDefined();
    expect(screen.getByText('En vivo')).toBeDefined();
    expect(screen.getByText('Argus mira')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver en grande' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hablar' }));
    expect(calls).toEqual(['camera c2', 'talk c2']);
  });

  test('an earlier camera is a line that still opens it', async () => {
    await show(card({ ...base, kind: 'camera', cameraId: 'c1', name: 'Patio' }));
    expect(screen.getByText('Te mostré Patio')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(calls).toEqual(['camera c1']);
  });

  test('an implicit reminder asks with two answers in the chat and by voice in the call', async () => {
    const offer: ArgusResult = {
      ...base,
      status: 'pending',
      kind: 'reminder',
      asking: true,
      title: 'Pagar el agua',
      remindAt: TOMORROW_9,
    };
    await show(card(offer));
    expect(screen.getByText('Pagar el agua')).toBeDefined();
    expect(screen.getByText(/^Mañana · /)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, recuérdamelo' }));
    fireEvent.click(screen.getByRole('button', { name: 'No, gracias' }));
    expect(calls).toEqual(['answer true', 'answer false']);
  });

  test('in the call the offer is answered aloud', async () => {
    await show(
      card(
        {
          ...base,
          status: 'pending',
          kind: 'reminder',
          asking: true,
          title: 'Dentista',
          remindAt: TOMORROW_9,
        },
        'call'
      )
    );
    expect(screen.queryByRole('button', { name: 'Sí, recuérdamelo' })).toBeNull();
    expect(screen.getByText('Dímelo: «sí» o «no».')).toBeDefined();
  });

  test('a moved event shows before and after, opens the agenda and undoes', async () => {
    await show(
      card({
        ...base,
        kind: 'event-moved',
        eventId: '41',
        title: 'Dentista',
        startsAt: TOMORROW_9,
        endsAt: null,
        previousStartsAt: NOW,
        previousEndsAt: null,
      })
    );
    expect(screen.getByText(/antes Hoy/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    });
    expect(calls).toEqual([`agenda ${TOMORROW_9}`, 'undo event 41']);
  });

  test('a mode change names the mode it replaced, opens Seguridad and undoes', async () => {
    await show(
      card({
        ...base,
        kind: 'guard-mode',
        mode: 'night',
        previousMode: 'home',
        environmentId: 2,
        environmentName: 'Casa',
      })
    );
    expect(screen.getByText('Modo Noche')).toBeDefined();
    expect(screen.getByText('Casa · antes En casa')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Seguridad' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    });
    expect(calls).toEqual(['security', 'undo mode home']);
  });

  test('a list answer keeps every item in the card', async () => {
    await show(
      card({
        ...base,
        kind: 'agenda-day',
        day: TOMORROW_9,
        items: [
          {
            id: '1',
            title: 'Pagar el agua',
            startsAt: TOMORROW_9,
            allDay: false,
            kind: 'reminder',
          },
          {
            id: '2',
            title: 'Cena con Luis',
            startsAt: TOMORROW_9 + 3_600_000,
            allDay: false,
            kind: 'event',
          },
        ],
      })
    );
    expect(screen.getByText('Mañana')).toBeDefined();
    expect(screen.getByText('2 cosas')).toBeDefined();
    expect(screen.getByText('Cena con Luis')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Agenda' }));
    expect(calls).toEqual([`agenda ${TOMORROW_9}`]);
  });

  test('a request for a module that is off offers to turn it on', async () => {
    await show(card({ ...base, kind: 'screen', screen: 'modules', module: 'productivity' }));
    expect(screen.getByText('Productividad está apagado')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Activar Productividad' }));
    expect(calls).toEqual(['screen modules']);
  });

  test('the call shows only its own newest result, live while the window is tall', async () => {
    setWindowSize(390, 844);
    await show(<CallResults since={NOW} />);
    expect(screen.getByText('video c2')).toBeDefined();
    expect(screen.queryByText('video c1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hablar' })).toBeNull();
  });

  test('each card is also usable on its own', async () => {
    await show(
      <>
        <ResultShell surface="call" label="Hecho">
          <ResultHead icon="check" tone="ok" title="Hecho" meta="Hace un momento" />
        </ResultShell>
        <CameraResultCard
          result={{ ...base, status: 'failed', kind: 'camera', cameraId: null, name: '' }}
          live={false}
          actions={actionsOf('call')}
        />
        <GuardModeCard
          result={{
            ...base,
            kind: 'guard-mode',
            mode: 'away',
            previousMode: null,
            environmentId: null,
            environmentName: null,
          }}
          actions={actionsOf('call')}
        />
        <AgendaDayCard
          result={{ ...base, kind: 'agenda-day', day: NOW, items: [] }}
          actions={actionsOf('call')}
          now={NOW}
        />
      </>
    );
    expect(screen.getByRole('group', { name: 'Hecho' })).toBeDefined();
    expect(screen.getByText('No pude mostrar esa cámara')).toBeDefined();
    expect(screen.getByText('Modo Fuera')).toBeDefined();
    expect(screen.getByText('Nada pendiente')).toBeDefined();
  });
});
