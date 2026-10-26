import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { VoiceActionRecord } from '@/core/types';
import '../../shared/ui/translation-stub';

const { CallAvatar } = await import('@/features/voice/components/call-avatar');
const { CallCaptions } = await import('@/features/voice/components/call-captions');
const { EndedSummary, StageTop, WaitingCard } =
  await import('@/features/voice/components/call-notes');
const { CallResultCard } = await import('@/features/voice/components/call-result-card');
const { CallStage } = await import('@/features/voice/components/call-stage');
const { RingControls } = await import('@/features/voice/components/ring-controls');
const { RoundControl } = await import('@/features/voice/components/round-control');

const CAMERA: VoiceActionRecord = {
  id: '1',
  name: 'app.show_camera',
  arguments: { camera: 'Patio trasero' },
  status: 'done',
  detail: null,
};

describe('the call parts', () => {
  test('a round control names itself and reports a pressed toggle', () => {
    const press = mock(() => undefined);
    render(
      <RoundControl icon="micoff" label="Silenciar" size={56} toggled tone="on" onPress={press} />
    );
    const control = screen.getByRole('switch', { name: 'Silenciar' });
    expect(control.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(control);
    expect(press).toHaveBeenCalledTimes(1);
  });

  test('a captioned round control shows its label under the circle', () => {
    render(
      <RoundControl
        icon="phone"
        label="Contestar"
        size={64}
        tone="answer"
        caption
        onPress={() => undefined}
      />
    );
    expect(screen.getByText('Contestar')).toBeDefined();
  });

  test('the ring row puts Rechazar left, En 10 min in the middle and Contestar right', () => {
    const chosen: string[] = [];
    render(
      <RingControls
        choices={['decline', 'snooze', 'answer']}
        onChoose={(choice) => chosen.push(choice)}
      />
    );
    const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual(['Rechazar', 'En 10 min', 'Contestar']);
    fireEvent.click(screen.getByRole('button', { name: 'En 10 min' }));
    expect(chosen).toEqual(['snooze']);
  });

  test('the stage carries the private line, Argus and the call line around Estela', () => {
    render(
      <CallStage kind="reminder" line="0:42" presence="speak">
        <></>
      </CallStage>
    );
    expect(screen.getByText('Privada · se queda en tu casa')).toBeDefined();
    expect(screen.getByText('Argus')).toBeDefined();
    expect(screen.getByText('0:42')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Argus' })).toBeDefined();
  });

  test('the avatar is decorative unless it is labelled', () => {
    const { container } = render(<CallAvatar state="listen" size={48} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild).not.toBeNull();
  });

  test('captions keep the last two lines and quote the user', () => {
    render(
      <CallCaptions
        lines={[
          { id: 'a', role: 'assistant', text: 'Uno.' },
          { id: 'b', role: 'assistant', text: 'Te llamo por la luz.' },
          { id: 'c', role: 'user', text: 'Ya la pago.' },
        ]}
      />
    );
    expect(screen.queryByText('Uno.')).toBeNull();
    expect(screen.getByText('«Ya la pago.»')).toBeDefined();
  });

  test('the result card offers Ver only when it can open the camera', () => {
    const view = mock(() => undefined);
    const { rerender } = render(
      <CallResultCard result={{ action: CAMERA, icon: 'cam', opensCamera: false }} onView={view} />
    );
    expect(screen.getByText('Cámara Patio trasero')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ver' })).toBeNull();
    rerender(
      <CallResultCard result={{ action: CAMERA, icon: 'cam', opensCamera: true }} onView={view} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(view).toHaveBeenCalledTimes(1);
  });

  test('the top bar minimises on the left and switches to chat on the right', () => {
    const minimise = mock(() => undefined);
    const chat = mock(() => undefined);
    render(<StageTop onMinimise={minimise} onSwitchToChat={chat} />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar la llamada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    expect(minimise).toHaveBeenCalledTimes(1);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  test('a second call waiting can be answered or left', () => {
    const answer = mock(() => undefined);
    render(
      <WaitingCard reason="Hay alguien en el patio" onAnswer={answer} onDismiss={() => undefined} />
    );
    expect(screen.getByText('Hay alguien en el patio')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Atender' }));
    expect(answer).toHaveBeenCalledTimes(1);
  });

  test('the ended summary lists only what was done', () => {
    const { container } = render(<EndedSummary actions={[{ ...CAMERA, status: 'failed' }]} />);
    expect(container.textContent).toBe('');
    render(<EndedSummary actions={[CAMERA]} />);
    expect(screen.getByText('Cámara Patio trasero')).toBeDefined();
  });
});
