import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { InfiniteListStub } from '@tests/support/infinite-list-stub';
import '../../../shared/ui/translation-stub';

mock.module('@/shared/components/ui/infinite-list', () => ({ InfiniteList: InfiniteListStub }));

const { DoneLaneList } = await import('@/features/projects/components/done-lane-list');

const done = (id: string): IProjectTaskCacheRow => ({
  id,
  projectId: 'p',
  title: `Tarea ${id}`,
  status: 'done',
  priority: 'none',
  dueAt: null,
});

describe('DoneLaneList', () => {
  test('finished tasks page from the database and reaching the end asks for the next page', () => {
    const asked: string[] = [];
    render(
      <DoneLaneList
        tasks={[done('1'), done('2')]}
        paging={{
          footer: 'loading',
          loading: false,
          onEndReached: () => asked.push('more'),
          retry: () => undefined,
        }}
        renderTask={(task) => <p>{task.title}</p>}
      />
    );
    expect(screen.getByText('Tarea 1')).toBeDefined();
    expect(screen.getByText('Tarea 2')).toBeDefined();
    const list = screen.getByTestId('infinite-list');
    expect(list.getAttribute('data-footer')).toBe('loading');
    expect(Number(list.getAttribute('data-max'))).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'end-reached' }));
    expect(asked).toEqual(['more']);
  });
});
