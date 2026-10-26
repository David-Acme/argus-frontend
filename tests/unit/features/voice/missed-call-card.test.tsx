import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { resetVoiceStub, setSnapshot, voiceStub } from './voice-session-stub';
import '../../shared/ui/translation-stub';

const navigate = mock((_href: string) => undefined);
const push = mock((_href: string) => undefined);
const markRead = mock((_target: unknown) => Promise.resolve({ ok: true }));
const feed: { rows: INotificationPreviewCacheRow[] } = { rows: [] };

mock.module('@/features/voice/services/voice', () => ({ voiceService: voiceStub }));
mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useRouter: () => ({ navigate, push }),
  useIsFocused: () => true,
}));
mock.module('@/shared/hooks/use-infinite-list', () => ({
  usePagedView: () => ({ rows: feed.rows }),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: () => true }),
}));
mock.module('@/core/services/notification.service', () => ({ notificationService: { markRead } }));

const { MissedCallCard } = await import('@/features/voice/components/missed-call-card');

const missed = (
  patch: Partial<INotificationPreviewCacheRow> = {}
): INotificationPreviewCacheRow => ({
  id: 'n-1',
  type: 'call',
  title: 'Llamada perdida · Pagar la luz',
  body: 'Te llamé por la luz.',
  isRead: false,
  data: { kind: 'call', callId: 'call-41', threadKey: 'agenda:reminder:9', urgency: 'active' },
  createdAt: Date.now() - 4 * 60_000,
  ...patch,
});

afterEach(() => {
  feed.rows = [];
  navigate.mockClear();
  push.mockClear();
  markRead.mockClear();
  act(() => resetVoiceStub());
});

describe('MissedCallCard', () => {
  test('a recent missed call shows its subject, its age and Devolver', () => {
    feed.rows = [missed()];
    render(<MissedCallCard />);
    expect(screen.getByText('Llamada perdida · Pagar la luz')).toBeDefined();
    expect(screen.getByText('Hace 4 min · Te llamé por la luz.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ver lo que pasó' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Marcar hecho' })).toBeNull();
  });

  test('Devolver calls Argus back and the card leaves for good', () => {
    feed.rows = [missed()];
    const { container } = render(<MissedCallCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }));
    expect(navigate).toHaveBeenCalledWith('/call');
    expect(markRead).toHaveBeenCalledWith({ threadKey: 'agenda:reminder:9', ids: ['n-1'] });
    expect(container.textContent).toBe('');
  });

  test('Ver lo que pasó opens the notification', () => {
    feed.rows = [missed({ data: { kind: 'call', urgency: 'critical' } })];
    render(<MissedCallCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver lo que pasó' }));
    expect(push).toHaveBeenCalledWith('/notification?notificationId=n-1');
  });

  test('nothing shows during a call, a ring, or without a recent missed call', () => {
    feed.rows = [missed({ createdAt: Date.now() - 2 * 60 * 60_000 })];
    const { container, rerender } = render(<MissedCallCard />);
    expect(container.textContent).toBe('');
    feed.rows = [missed()];
    act(() => setSnapshot({ isActive: true }));
    rerender(<MissedCallCard />);
    expect(container.textContent).toBe('');
  });
});
