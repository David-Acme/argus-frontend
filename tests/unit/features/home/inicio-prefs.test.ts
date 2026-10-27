import { describe, expect, test } from 'bun:test';
import type { InicioSurface } from '@/shared/libs/surfaces';
import { rankedModules } from '@/features/home/model/module-cards';
import {
  applyInicioPrefs,
  moveSection,
  orderedSections,
  toggleHidden,
} from '@/features/home/model/inicio-prefs';
import { cameraAttention } from '@/features/surfaces/model/camera-attention';
import type { TranslateFn } from '@/core/types';
import { entryCount, hiddenAttention } from '@/features/navigation/model/nav-model';

type Surface = Pick<InicioSurface, 'id' | 'places'>;

const SURFACES: readonly Surface[] = [
  { id: 'news', places: { stack: { order: 50 }, band: { order: 10, column: 'news' } } },
  { id: 'now', places: { stack: { order: 20 }, band: { order: 20, column: 'agenda' } } },
  { id: 'cameras', places: { stack: { order: 30 }, band: { order: 10, column: 'side' } } },
];

const t = ((key: string, params?: { camera?: string }) =>
  `${key}${params?.camera ? `:${params.camera}` : ''}`) as unknown as TranslateFn;

describe('Personalizar Inicio', () => {
  test('a hidden section leaves, the rest keep their place', () => {
    const shown = applyInicioPrefs(SURFACES, { hidden: ['now'], order: [] });
    expect(shown.map((surface) => surface.id)).toEqual(['news', 'cameras']);
  });

  test('a chosen order leads every form, and the rest follow in Argus’s order', () => {
    const prefs = { hidden: [], order: ['news'] };
    const placed = applyInicioPrefs(SURFACES, prefs);
    expect(placed.find((surface) => surface.id === 'news')?.places.band?.column).toBe('news');
    expect(orderedSections(placed, prefs).map((surface) => surface.id)).toEqual([
      'news',
      'cameras',
      'now',
    ]);
  });

  test('moving and toggling', () => {
    expect(moveSection(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(moveSection(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    const hidden = toggleHidden({ hidden: [], order: [] }, 'now', false);
    expect(hidden.hidden).toEqual(['now']);
    expect(toggleHidden(hidden, 'now', true).hidden).toEqual([]);
  });
});

describe('attention', () => {
  test('a camera that is on but does not answer needs attention, one that is off does not', () => {
    const items = cameraAttention(
      [
        { id: '1', name: 'Cocina', isEnabled: true, isOnline: false },
        { id: '2', name: 'Patio', isEnabled: false, isOnline: false },
        { id: '3', name: 'Puerta', isEnabled: true, isOnline: true },
      ],
      t
    );
    expect(items.map((item) => item.href)).toEqual(['/cameras/1']);
    expect(items[0]?.title).toBe('screens.cameras.attention.offline:Cocina');
  });

  test('modules rank by their alerts, then by priority', () => {
    const modules = [
      {
        module: 'a',
        order: 10,
        label: 'screens.navigation.home',
        icon: 'home',
        href: '/',
        destinations: [],
      },
      {
        module: 'b',
        order: 20,
        label: 'screens.navigation.home',
        icon: 'home',
        href: '/',
        destinations: [],
      },
    ] as const;
    expect(rankedModules(modules, new Map([['b', 2]])).map((module) => module.module)).toEqual([
      'b',
      'a',
    ]);
    expect(rankedModules(modules, new Map()).map((module) => module.module)).toEqual(['a', 'b']);
  });

  test('«Todo» counts the alerts of the modules outside the bar, a pinned module its own', () => {
    const entries = [
      { key: 'home', href: '/', icon: 'home', label: 'screens.navigation.home' },
      { key: 'module:a', href: '/a', icon: 'home', label: 'screens.navigation.home' },
      { key: 'all', href: '', icon: 'grid', label: 'screens.navigation.all' },
    ] as const;
    const counts = new Map([
      ['a', 1],
      ['b', 3],
    ]);
    expect(hiddenAttention(entries, counts)).toBe(3);
    expect(entryCount(entries[1], entries, counts)).toBe(1);
    expect(entryCount(entries[2], entries, counts)).toBe(3);
    expect(entryCount(entries[0], entries, counts)).toBe(0);
  });
});
