import { describe, expect, test } from 'bun:test';
import { accessFor, viewFor } from '@tests/support/access-fixtures';
import { surfacesFor } from '@tests/support/app-surfaces';
import { accessView } from '@/shared/libs/capabilities';
import {
  activeChild,
  activeKey,
  barEntries,
  barKey,
  navGroups,
  NO_PINS,
  pinnedModules,
  quickModules,
  railEntries,
  railFoot,
  togglePin,
} from '@/features/navigation/model/nav-model';
import { barShownOn, tabMove } from '@/features/navigation/model/nav-sections';

const keysOf = (entries: readonly { key: string }[]) => entries.map((entry) => entry.key);

describe('the phone bar', () => {
  test('owner and resident with both modules: Inicio, two modules, Argus in the centre, Todo', () => {
    for (const role of ['owner', 'resident'] as const)
      expect(keysOf(barEntries(surfacesFor(viewFor(role)), NO_PINS))).toEqual([
        'home',
        'module:surveillance',
        'argus',
        'module:productivity',
        'all',
      ]);
  });

  test('with one module: Inicio, it, Argus, Todo', () => {
    expect(
      keysOf(barEntries(surfacesFor(viewFor('owner', { modules: ['productivity'] })), NO_PINS))
    ).toEqual(['home', 'module:productivity', 'argus', 'all']);
  });

  test('a guest has no module: Inicio, Argus, Todo', () => {
    expect(keysOf(barEntries(surfacesFor(viewFor('guest')), NO_PINS))).toEqual([
      'home',
      'argus',
      'all',
    ]);
  });

  test('an unknown role keeps Inicio and Todo, with no Argus', () => {
    const unknown = accessView(
      { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] },
      null
    );
    expect(keysOf(barEntries(surfacesFor(unknown), NO_PINS))).toEqual(['home', 'all']);
  });

  test('a guard whose module is off keeps the baseline', () => {
    expect(
      keysOf(barEntries(surfacesFor(viewFor('guard', { modules: ['productivity'] })), NO_PINS))
    ).toEqual(['home', 'all']);
  });

  test('a module outside the bar lights Todo', () => {
    expect(
      barKey(
        'module:fake',
        ['home', 'all'].map((key) => ({
          key,
          href: '',
          icon: 'home',
          label: 'screens.navigation.home',
        }))
      )
    ).toBe('all');
  });
});

describe('the rail and the sidebar', () => {
  test('the rail: menu, Inicio, Argus, pinned modules, Todo; Tú at the foot', () => {
    const resolved = surfacesFor(viewFor('owner'));
    expect(keysOf(railEntries(resolved, NO_PINS))).toEqual([
      'menu',
      'home',
      'argus',
      'module:surveillance',
      'module:productivity',
      'all',
    ]);
    expect(keysOf(railFoot(resolved))).toEqual(['you']);
  });

  test('the sidebar: the core, every module with its sections, then the account', () => {
    const groups = navGroups(surfacesFor(viewFor('owner')), NO_PINS);
    expect(keysOf(groups.core)).toEqual(['home', 'argus', 'news']);
    expect(keysOf(groups.modules)).toEqual(['module:surveillance', 'module:productivity']);
    expect(keysOf(groups.modules[0]?.children ?? [])).toEqual([
      'security',
      'cameras',
      'clips',
      'episodes',
      'watch',
    ]);
    expect(keysOf(groups.account)).toEqual(['you', 'settings']);
  });

  test("a resident reads no Ajustes, and the guest's sidebar has no module group", () => {
    expect(keysOf(navGroups(surfacesFor(viewFor('resident')), NO_PINS).account)).toEqual(['you']);
    expect(navGroups(surfacesFor(viewFor('guest')), NO_PINS).modules).toEqual([]);
  });
});

describe('pins', () => {
  test('a saved pin leads, the rest fill by priority, an inactive pin is skipped', () => {
    const modules = surfacesFor(viewFor('owner')).modules;
    expect(pinnedModules(modules, ['productivity'], 1).map((module) => module.module)).toEqual([
      'productivity',
    ]);
    expect(pinnedModules(modules, ['gone'], 2).map((module) => module.module)).toEqual([
      'surveillance',
      'productivity',
    ]);
    expect(quickModules(modules, { bar: [], quick: ['productivity'] })[0]?.module).toBe(
      'productivity'
    );
    expect(togglePin(['a'], 'b', 2)).toEqual(['b', 'a']);
    expect(togglePin(['a', 'b'], 'a', 2)).toEqual(['b']);
    expect(togglePin(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
  });
});

describe('the active place', () => {
  test('a pushed route keeps the module or the core place that owns it', () => {
    const resolved = surfacesFor(viewFor('owner'));
    expect(activeKey('/', resolved)).toBe('home');
    expect(activeKey('/notification', resolved)).toBe('home');
    expect(activeKey('/cameras/3', resolved)).toBe('module:surveillance');
    expect(activeKey('/clips', resolved)).toBe('module:surveillance');
    expect(activeKey('/conversations/0', resolved)).toBe('argus');
    expect(activeKey('/projects', resolved)).toBe('module:productivity');
    expect(activeKey('/profile', resolved)).toBe('you');
    expect(activeKey('/settings/modules', resolved)).toBe('settings');
    expect(activeChild('/clips/4', resolved)).toBe('clips');
  });
});

describe('barShownOn', () => {
  test('the bar shows on the tab roots and hides on full-screen pushed routes', () => {
    for (const path of [
      '/',
      '/security',
      '/agenda',
      '/projects',
      '/profile',
      '/settings',
      '/conversations',
      '/cameras/3',
      '/cameras/3/settings',
    ])
      expect(barShownOn(path)).toBe(true);
    for (const path of [
      '/cameras',
      '/clips/4',
      '/conversations/0',
      '/security/2',
      '/watch',
      '/settings/activity',
      '/settings/tts',
      '/profile/sessions',
    ])
      expect(barShownOn(path)).toBe(false);
  });
});

describe('tabMove', () => {
  test('the active tab stays, Inicio dismisses, Inicio pushes and the rest replace', () => {
    expect(tabMove('/agenda', '/agenda')).toBe('stay');
    expect(tabMove('/agenda', '/')).toBe('home');
    expect(tabMove('/', '/agenda')).toBe('push');
    expect(tabMove('/?panel=notifications', '/agenda')).toBe('push');
    expect(tabMove('/cameras/3', '/security')).toBe('replace');
  });
});
