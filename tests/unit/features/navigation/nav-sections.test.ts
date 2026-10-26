import { describe, expect, test } from 'bun:test';
import { accessFor, viewFor } from '@tests/support/access-fixtures';
import { accessView } from '@/shared/libs/capabilities';
import {
  barShownOn,
  sectionOf,
  settingsVisible,
  tabMove,
  visibleTabs,
} from '@/features/navigation/model/nav-sections';

const keysOf = (tabs: ReturnType<typeof visibleTabs>) => tabs.map((tab) => tab.key);

describe('visibleTabs', () => {
  test('owner and resident with both modules get the five tabs, Argus in the centre', () => {
    for (const role of ['owner', 'resident'] as const)
      expect(keysOf(visibleTabs(viewFor(role)))).toEqual([
        'home',
        'security',
        'argus',
        'agenda',
        'you',
      ]);
  });

  test('with one module off the owner and the resident get four', () => {
    for (const role of ['owner', 'resident'] as const) {
      expect(keysOf(visibleTabs(viewFor(role, { modules: ['surveillance'] })))).toEqual([
        'home',
        'security',
        'argus',
        'you',
      ]);
      expect(keysOf(visibleTabs(viewFor(role, { modules: ['productivity'] })))).toEqual([
        'home',
        'argus',
        'agenda',
        'you',
      ]);
    }
  });

  test('a guard gets Inicio, Seguridad, Argus and Tú', () => {
    expect(keysOf(visibleTabs(viewFor('guard')))).toEqual(['home', 'security', 'argus', 'you']);
  });

  test('a guest gets Inicio, Argus and Tú', () => {
    expect(keysOf(visibleTabs(viewFor('guest')))).toEqual(['home', 'argus', 'you']);
  });

  test('an unknown role gets Inicio and Tú, with no Argus', () => {
    const unknown = accessView(
      { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] },
      null
    );
    expect(keysOf(visibleTabs(unknown))).toEqual(['home', 'you']);
  });

  test('a guard whose module is off keeps only the baseline: Inicio and Tú', () => {
    expect(keysOf(visibleTabs(viewFor('guard', { modules: ['productivity'] })))).toEqual([
      'home',
      'you',
    ]);
  });
});

describe('settingsVisible', () => {
  test('only the roles that manage settings see Ajustes', () => {
    expect(settingsVisible(viewFor('owner'))).toBe(true);
    expect(settingsVisible(viewFor('resident'))).toBe(false);
    expect(settingsVisible(viewFor('guest'))).toBe(false);
  });
});

describe('sectionOf', () => {
  test('pushed child routes keep the tab that owns them', () => {
    expect(sectionOf('/', false)).toBe('home');
    expect(sectionOf('/notification', false)).toBe('home');
    expect(sectionOf('/security/4', false)).toBe('security');
    expect(sectionOf('/cameras/3', false)).toBe('security');
    expect(sectionOf('/watch', false)).toBe('security');
    expect(sectionOf('/conversations/0', false)).toBe('argus');
    expect(sectionOf('/conversations', false)).toBe('argus');
    expect(sectionOf('/agenda?edit=4', false)).toBe('agenda');
    expect(sectionOf('/projects', false)).toBe('agenda');
    expect(sectionOf('/profile', false)).toBe('you');
    expect(sectionOf('/people', false)).toBe('you');
    expect(sectionOf('/users/visitors/2', false)).toBe('you');
  });

  test('settings belong to Tú unless the sidebar shows Ajustes', () => {
    expect(sectionOf('/settings/modules', false)).toBe('you');
    expect(sectionOf('/settings/modules', true)).toBe('settings');
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
