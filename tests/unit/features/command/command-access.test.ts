import { describe, expect, test } from 'bun:test';
import { accessView } from '@/shared/libs/capabilities';
import { commandAccess, createHref, entryHref } from '@/features/command/model/command-access';
import type { SearchEntry } from '@/features/command/model/command-search';
import { accessFor, viewFor } from '@tests/support/access-fixtures';
import { surfacesFor } from '@tests/support/app-surfaces';
import type { AccessView } from '@/shared/libs/capabilities';

const entry = (patch: Partial<SearchEntry> & Pick<SearchEntry, 'kind'>): SearchEntry => ({
  id: '7',
  title: 'Algo',
  at: null,
  ...patch,
});

const accessOf = (view: AccessView, hasProjects: boolean) =>
  commandAccess(view, hasProjects, surfacesFor(view));

describe('command access', () => {
  test('an owner with both modules searches everything, creates everything and jumps to every section the registry marks', () => {
    const access = accessOf(viewFor('owner'), true);
    expect([...access.search].sort()).toEqual(['camera', 'event', 'person', 'project', 'task']);
    expect(access.create).toEqual(['reminder', 'event', 'task', 'project']);
    expect(access.sections.map(({ key, shortcut }) => `${shortcut}:${key}`)).toEqual([
      '1:home',
      '2:argus',
      '3:security',
      '4:clips',
      '5:agenda',
      '6:you',
    ]);
    expect(access.asks).toBe(true);
    expect(access.people).toBe('/users');
  });

  test('without projects there is no new task to offer', () => {
    expect(accessOf(viewFor('owner'), false).create).toEqual(['reminder', 'event', 'project']);
  });

  test('a module that is off takes its results, its actions and its section away, and the shortcuts close up', () => {
    const access = accessOf(viewFor('owner', { modules: ['surveillance'] }), true);
    expect([...access.search].sort()).toEqual(['camera', 'person']);
    expect(access.create).toEqual(['reminder']);
    expect(access.sections.map(({ key, shortcut }) => `${shortcut}:${key}`)).toEqual([
      '1:home',
      '2:argus',
      '3:security',
      '4:clips',
      '5:you',
    ]);
  });

  test('a guard reads the directory and the cameras but no agenda, and only asks Argus for reminders', () => {
    const access = accessOf(viewFor('guard'), true);
    expect([...access.search].sort()).toEqual(['camera', 'person']);
    expect(access.create).toEqual(['reminder']);
    expect(access.people).toBe('/people');
  });

  test('a resident sees only their own profile, so people are not searched', () => {
    expect(accessOf(viewFor('resident'), true).search.has('person')).toBe(false);
  });

  test('a role this build does not know gets no Argus, no results and no actions', () => {
    const view = accessView(
      { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] },
      'guest'
    );
    const access = accessOf(view, true);
    expect(access.asks).toBe(false);
    expect(access.search.size).toBe(0);
    expect(access.create).toEqual([]);
    expect(access.sections.map(({ key }) => key)).toEqual(['home', 'you']);
  });

  test('each result opens its own screen', () => {
    const open = { people: '/users' as const };
    expect(entryHref(entry({ kind: 'event', at: 1000 }), open)).toEqual({
      pathname: '/agenda',
      params: { at: '1000' },
    });
    expect(entryHref(entry({ kind: 'task', parentId: '3' }), open)).toEqual({
      pathname: '/projects',
      params: { id: '3', task: '7' },
    });
    expect(entryHref(entry({ kind: 'project' }), open)).toEqual({
      pathname: '/projects',
      params: { id: '7' },
    });
    expect(entryHref(entry({ kind: 'person' }), open)).toBe('/users');
    expect(entryHref(entry({ kind: 'camera' }), open)).toEqual({
      pathname: '/cameras/[id]',
      params: { id: '7' },
    });
  });

  test('the new-item actions open the create flow of their screen', () => {
    expect(createHref('event')).toEqual({ pathname: '/agenda', params: { new: 'event' } });
    expect(createHref('task')).toEqual({ pathname: '/projects', params: { new: 'task' } });
    expect(createHref('project')).toEqual({ pathname: '/projects', params: { new: 'project' } });
  });
});
