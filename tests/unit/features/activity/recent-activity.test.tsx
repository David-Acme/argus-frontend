import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ActivityItem } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import '../../shared/ui/translation-stub';

const item = (id: number, table: string): ActivityItem => ({
  id,
  userId: 1,
  recordId: id,
  table,
  module: 'productivity',
  action: 'create',
  oldData: null,
  newData: { title: 'Pagar la luz' },
  ipAddress: '',
  createdAt: 1_791_835_200 - id * 60,
});

const state = {
  allowed: true,
  rows: [] as ActivityItem[],
  status: 'ready',
  pushed: [] as unknown[],
  reloads: 0,
  filters: [] as unknown[],
};

mock.module('@/features/activity/hooks/use-activity-feed', () => ({
  useActivityFeed: (filter: unknown) => {
    state.filters.push(filter);
    return {
      rows: state.rows,
      status: state.status,
      reload: async () => void (state.reloads += 1),
    };
  },
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: () => state.allowed }),
}));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: () => [{ id: '1', name: 'Ana', lastName: 'Ruiz' }],
}));
mock.module('@/features/modules', () => ({ useModuleCatalog: () => null }));
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
mock.module('expo-router', () => ({
  useRouter: () => ({ push: (href: unknown) => state.pushed.push(href) }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
}));

const { RecentActivitySection } =
  await import('@/features/activity/components/recent-activity-section');

beforeEach(() => {
  Object.assign(state, {
    allowed: true,
    rows: [],
    status: 'ready',
    pushed: [],
    reloads: 0,
    filters: [],
  });
});

describe('Lo último que hiciste', () => {
  test('lists the person’s own latest changes, at most five, and opens Actividad', () => {
    state.rows = [1, 2, 3, 4, 5, 6].map((id) => item(id, 'reminder'));
    render(<RecentActivitySection userId={1} fallback={<span>ayuda</span>} />);
    expect(screen.getByRole('heading', { name: 'Lo último que hiciste' })).toBeDefined();
    expect(screen.getAllByText(/^Ana Ruiz/)).toHaveLength(5);
    expect(state.filters[0]).toMatchObject({ userId: 1 });
    fireEvent.click(screen.getByRole('link', { name: 'Ver actividad' }));
    expect(state.pushed).toEqual(['/settings/activity']);
  });

  test('a role without the history, or an empty week, shows the fallback instead', () => {
    state.allowed = false;
    const refused = render(<RecentActivitySection userId={1} fallback={<span>ayuda</span>} />);
    expect(screen.getByText('ayuda')).toBeDefined();
    refused.unmount();
    state.allowed = true;
    render(<RecentActivitySection userId={1} fallback={<span>ayuda</span>} />);
    expect(screen.getByText('ayuda')).toBeDefined();
  });

  test('a failed read says so and retries', () => {
    state.status = 'failed';
    render(<RecentActivitySection userId={1} fallback={null} />);
    fireEvent.click(screen.getByRole('button', { name: /^No se pudo leer la actividad/ }));
    expect(state.reloads).toBe(1);
  });
});
