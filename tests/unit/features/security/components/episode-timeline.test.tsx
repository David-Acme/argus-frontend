import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GuardEpisodeDetail } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { episode } from '../security-fixtures';
import '../../../shared/ui/translation-stub';

type Detail = { data: GuardEpisodeDetail | null; status: 'loading' | 'ready' | 'failed' };

const detail: Detail = { data: null, status: 'loading' };

const reloads: number[] = [];

const dates = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: null,
});

mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: () => dates }));
mock.module('@/core/services/guard.service', () => ({
  guardService: {
    episode: async () => ({ ok: true, info: detail.data, errors: null, status: 200 }),
  },
}));
mock.module('@/shared/hooks/use-remote-resource', () => ({
  useRemoteResource: () => ({ ...detail, reload: async () => void reloads.push(1) }),
}));

const { EpisodeTimeline } = await import('@/features/security/components/episode-timeline');

afterEach(() => {
  Object.assign(detail, { data: null, status: 'loading' });
  reloads.length = 0;
});

describe('EpisodeTimeline', () => {
  test('before the detail arrives it shows rows in the shape of the timeline', () => {
    const { container } = render(<EpisodeTimeline episodeId={1} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Empezó a observar')).toBeNull();
  });

  test('each step is a row with its time, and a failed read offers Reintentar', () => {
    const at = new Date(2026, 9, 21, 21, 53).getTime() / 1000;
    detail.data = {
      ...episode(),
      timeline: [
        { type: 'state', at, state: 'observing', reason: '' },
        { type: 'action', at, action: 'notify', status: 'succeeded' },
      ],
    };
    detail.status = 'ready';
    const { unmount } = render(<EpisodeTimeline episodeId={1} />);
    expect(screen.getByText('Empezó a observar')).toBeDefined();
    expect(screen.getByText('Notificación enviada')).toBeDefined();
    expect(screen.getAllByText('21:53')).toHaveLength(2);
    unmount();
    Object.assign(detail, { data: null, status: 'failed' });
    render(<EpisodeTimeline episodeId={1} />);
    expect(screen.getByText('No se pudo cargar la historia.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reloads).toEqual([1]);
  });
});
